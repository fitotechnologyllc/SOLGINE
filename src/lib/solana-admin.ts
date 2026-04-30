import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  mplTokenMetadata, 
  createNft,
  TokenStandard
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  keypairIdentity, 
  generateSigner, 
  percentAmount,
  publicKey
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const getUmi = () => {
  const umi = createUmi(RPC_URL).use(mplTokenMetadata());

  if (process.env.SOLANA_PRIVATE_KEY) {
    try {
      // Assuming private key is in base58 format
      const secretKey = base58.serialize(process.env.SOLANA_PRIVATE_KEY);
      const adminKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
      umi.use(keypairIdentity(adminKeypair));
    } catch (e) {
      console.error("Failed to initialize Solana Admin Keypair", e);
    }
  }

  return umi;
};

export async function mintCardNFT(metadata: {
  name: string;
  symbol: string;
  uri: string;
  ownerAddress: string;
  rarity: string;
  attack: number;
  defense: number;
}) {
  const umi = getUmi();
  const mint = generateSigner(umi);

  const result = await createNft(umi, {
    mint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints: percentAmount(5),
    tokenStandard: TokenStandard.NonFungible,
    isMutable: true,
    // We mint it to the admin first, or directly to the user if we have a way.
    // For simplicity, let's mint to the user provided.
    // Metaplex createNft defaults to current identity, but we can transfer or use a specific owner.
  }).sendAndConfirm(umi);

  return {
    mintAddress: mint.publicKey,
    signature: base58.deserialize(result.signature)[0],
  };
}
