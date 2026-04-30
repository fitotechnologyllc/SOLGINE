import { NextResponse } from 'next/server';
import { adminDb, adminAuth, adminStorage, admin } from '@/lib/firebase-admin';
import { mintCardNFT } from '@/lib/solana-admin';
import * as nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { decodeUTF8 } from 'tweetnacl-util';

export async function POST(req: Request) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server not configured for minting' }, { status: 500 });
    }

    const { userId, cardId, publicKey, signature, message } = await req.json();

    if (!userId || !cardId || !publicKey || !signature || !message) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Verify Wallet Signature
    const signatureUint8 = new Uint8Array(Object.values(signature));
    const messageUint8 = decodeUTF8(message);
    const pubKeyUint8 = new PublicKey(publicKey).toBytes();
    const verified = nacl.sign.detached.verify(messageUint8, signatureUint8, pubKeyUint8);
    
    if (!verified) {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
    }

    // 2. Check User Ownership & Rarity
    const userCollRef = adminDb.collection('playerCollections').doc(userId);
    const userCollSnap = await userCollRef.get();
    if (!userCollSnap.exists) {
      return NextResponse.json({ error: 'Player collection not found' }, { status: 404 });
    }

    const collData = userCollSnap.data();
    const cards = collData.cards || [];
    const cardEntry = cards.find((c: any) => c.cardId === cardId);

    if (!cardEntry) {
      return NextResponse.json({ error: 'Card not found in collection' }, { status: 404 });
    }

    const availableToMint = (cardEntry.count || 0) - (cardEntry.mintedCount || 0);
    if (availableToMint <= 0) {
      return NextResponse.json({ error: 'No available un-minted copies of this card' }, { status: 400 });
    }

    const cardSnap = await adminDb.collection('cards').doc(cardId).get();
    if (!cardSnap.exists) {
      return NextResponse.json({ error: 'Card template data missing' }, { status: 404 });
    }
    const cardData = cardSnap.data()!;

    const allowedRarities = ['epic', 'legendary', 'mythic'];
    if (!allowedRarities.includes(cardData.rarity.toLowerCase())) {
      return NextResponse.json({ error: 'Only Epic, Legendary, or Mythic cards can be minted' }, { status: 400 });
    }

    // 3. Prepare Metadata & Upload to Storage
    const metadata = {
      name: `SOLGINE: ${cardData.name}`,
      symbol: "SOLG",
      description: cardData.description || `A powerful ${cardData.rarity} card from the SOLGINE Hyper Archive.`,
      image: cardData.imageUrl,
      external_url: "https://solgine.com",
      attributes: [
        { trait_type: "Rarity", value: cardData.rarity },
        { trait_type: "Attack", value: cardData.attack },
        { trait_type: "Defense", value: cardData.defense },
        { trait_type: "Type", value: cardData.type || 'Character' },
        { trait_type: "Ability", value: cardData.ability || 'None' }
      ],
      properties: {
        files: [{ uri: cardData.imageUrl, type: "image/png" }],
        category: "image"
      }
    };

    // Upload to Firebase Storage for public access
    const bucket = adminStorage.bucket();
    const fileName = `nfts/${cardId}_${Date.now()}.json`;
    const file = bucket.file(fileName);
    
    await file.save(JSON.stringify(metadata), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      }
    });
    
    // Make public and get URL
    await file.makePublic();
    const metadataUri = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // 4. Mint NFT via Solana
    // Note: If SOLANA_PRIVATE_KEY is missing, this will fail with a helpful error in solana-admin
    const mintResult = await mintCardNFT({
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadataUri,
      ownerAddress: publicKey,
      rarity: cardData.rarity,
      attack: cardData.attack,
      defense: cardData.defense
    });

    // 5. Update Firestore Atomic Batch
    const batch = adminDb.batch();
    
    // Update player collection count
    const updatedCards = cards.map((c: any) => {
      if (c.cardId === cardId) {
        return { ...c, mintedCount: (c.mintedCount || 0) + 1 };
      }
      return c;
    });
    batch.update(userCollRef, { cards: updatedCards });

    // Create record in mintedCards
    const mintRecordRef = adminDb.collection('mintedCards').doc(mintResult.mintAddress.toString());
    batch.set(mintRecordRef, {
      cardId,
      userId,
      walletAddress: publicKey,
      mintAddress: mintResult.mintAddress.toString(),
      signature: mintResult.signature,
      metadataUri,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      mintAddress: mintResult.mintAddress.toString(),
      signature: mintResult.signature,
      explorerUrl: `https://explorer.solana.com/address/${mintResult.mintAddress.toString()}?cluster=devnet`
    });

  } catch (error: any) {
    console.error("NFT Minting Exception:", error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred during minting' 
    }, { status: 500 });
  }
}
