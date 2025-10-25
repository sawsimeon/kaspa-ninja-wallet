# Kaspa Ninja Wallet

  A secure, decentralized Kaspa wallet running on the Internet Computer (ICP) that demonstrates the power of chain fusion technology. Send and receive Kaspa (KAS) directly through a beautiful web interface powered
  by Internet Identity authentication and ICP's threshold ECDSA.

  This application showcases ICP's unique capabilities including:
  - **Internet Identity** for secure, passwordless authentication
  - **Threshold ECDSA** for cryptographic key management without storing private keys
  - **HTTP Outcalls** for real-time blockchain integration
  - **Chain Fusion** connecting Kaspa blockchain with the Internet Computer

  ## Features

  - 🥷 **Ninja-themed UI** with modern glassmorphism design
  - 🔐 **Secure Authentication** via Internet Identity
  - 💰 **Real Kaspa Transactions** with mainnet integration
  - 🎨 **Beautiful Interface** with Gen Z aesthetic and smooth animations
  - 📱 **Responsive Design** that works on all devices
  - ⚡ **Real-time Balance** updates and transaction status

  ## Deploying from ICP Ninja

  When viewing this project in ICP Ninja, you can deploy it directly to the mainnet for free by clicking "Run" in the upper right corner.

  Open this project in ICP Ninja: [Add your ICP Ninja link here]

  ## Project Structure

  The `/backend` folder contains the Motoko canister (`main.mo`) that handles:
  - Kaspa address generation using threshold ECDSA
  - Balance checking via HTTP outcalls to Kaspa network
  - Transaction building and broadcasting
  - Secure user authentication

  The `/frontend` folder contains the React application with:
  - Modern React UI with Vite build system
  - Internet Identity integration
  - Glassmorphism design with smooth animations
  - Responsive layout for all screen sizes

  Edit the `mops.toml` file to add Motoko dependencies. This project uses the `kaspa` package for blockchain integration.

  ## Technology Stack

  - **Backend**: Motoko with ICP's threshold ECDSA and HTTP outcalls
  - **Frontend**: React + Vite with modern CSS animations
  - **Authentication**: Internet Identity
  - **Blockchain**: Kaspa mainnet integration
  - **Styling**: Custom CSS with Space Grotesk font and glassmorphism effects

  ## Build and Deploy from Command-Line

  To migrate your ICP Ninja project off of the web browser and develop it locally, follow these steps. These steps are necessary if you want to deploy this project for long-term, production use on the mainnet.

  1. Download your project from ICP Ninja using the 'Download files' button on the upper left corner under the pink ninja star icon.
  2. Open the BUILD.md file for further instructions.

  ## Local Development

  ```bash
  # Install dependencies
  npm install
  mops install

  # Start local replica
  dfx start --background

  # Deploy locally
  dfx deploy

  # Access the application
  open http://localhost:4943/?canisterId=<frontend-canister-id>

  About Chain Fusion

  This project demonstrates ICP's chain fusion capabilities by securely connecting to the Kaspa blockchain without bridges or wrapped tokens. The Internet Computer directly manages Kaspa private keys using threshold
   cryptography and executes transactions on the Kaspa network via HTTP outcalls.

  Built for the ICP Ninja community - showcasing the future of multi-chain applications! 🚀

  This README:
  - Explains what the Kaspa Ninja Wallet does
  - Highlights ICP's unique features being demonstrated
  - Describes the ninja theme and modern UI
  - Explains the technical architecture
  - Provides clear setup instructions
  - Emphasizes the chain fusion aspect
  - Maintains the ICP Ninja deployment instructions