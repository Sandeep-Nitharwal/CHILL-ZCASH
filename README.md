
# CHILL-ZCASH

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Sandeep-Nitharwal/CHILL-ZCASH.git
   cd CHILL-ZCASH
   ```
2. Install the dependencies:
    node version - 18.19.1

   ```bash
   pnpm install
   ```

### Environment Variables

Create a `.env` file in the root directory of your project and add the necessary environment keys. Here is an example of what your `.env` file might look like:

```plaintext
NEAR_NETWORK=           #"mainnet" 
NEAR_RPC_URL=           #"https://rpc.mainnet.near.org"
NEAR_SLIPPAGE=           #1
NEAR_WALLET_PUBLIC_KEY=   #"ed25519:-----------------------"
NEAR_WALLET_SECRET_KEY=   #"ed25519:------------------------------------------------------------------------------"
NEAR_ADDRESS=             #"abc.near"
DEFUSE_CONTRACT_ID=       #"intents.near"
ZCASH_WALLET=             # nodeurl for zcash "http://172.23.0.131:8323"
EXPORT_DIR_ZCASH=         # location of file used for storing zcash variable used by our UI. - eg - root/abc.txt
ZCASH_USER=               # Zcash rpc username
ZCASH_PASSD=              # Zcash rpc password
ZCASH_ACCOUNT=            # Unified address for zcash account present in nodeurl

COINGECKO_API_URL=          #"https://api.coingecko.com/api/v3"
COINGECKO_API_KEY=          #API key
```

### Running the Project

To start the project, run the following command:

```bash
pnpm run dev
```

This will start the development server and open the project in your default web browser.