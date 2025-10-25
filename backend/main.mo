// ICP Ninja Example: Simple Kaspa Wallet
// Demonstrates basic Kaspa blockchain integration on Internet Computer

import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat32 "mo:base/Nat32";
import Nat8 "mo:base/Nat8";
import Debug "mo:base/Debug";

import Wallet "mo:kaspa/wallet";

persistent actor KaspaNinjaWallet {

  // Initialize a mainnet wallet instance
  transient let wallet = Wallet.createMainnetWallet("test_key_1");

  // Simple authentication check
  private func requireAuth(caller : Principal) : Result.Result<(), Text> {
    if (Principal.isAnonymous(caller)) {
      #err("Authentication required")
    } else {
      #ok(())
    }
  };

  // Safe hash function that prevents overflow
  private func simpleHash(bytes : [Nat8]) : Nat32 {
    var hash : Nat32 = 0;
    let prime : Nat32 = 31;
    let maxVal : Nat32 = 0xFFFFFFFF;

    for (byte in bytes.vals()) {
      // Use modular arithmetic to prevent overflow
      hash := ((hash % (maxVal / prime)) * prime + Nat32.fromNat(Nat8.toNat(byte))) % maxVal
    };
    hash
  };

  // Convert principal to derivation path using hash to reduce collisions
  private func principalToDerivationPath(principal : Principal) : Text {
    let principalBlob = Principal.toBlob(principal);
    let bytes = Blob.toArray(principalBlob);

    // Hash the full principal to reduce collision risk
    let hash1 = simpleHash(bytes);

    // Create a second hash by shifting bytes
    let shiftedBytes = Array.tabulate<Nat8>(
      bytes.size(),
      func(i) {
        if (i < bytes.size() - 1) bytes[i + 1] else bytes[0]
      }
    );
    let hash2 = simpleHash(shiftedBytes);

    // Use both hashes as a derivation path: "hash1/hash2"
    Nat32.toText(hash1) # "/" # Nat32.toText(hash2)
  };

  // Generate a new Kaspa address using user's principal as derivation path
  public shared (msg) func generateAddress() : async Result.Result<Wallet.AddressInfo, Text> {
    switch (requireAuth(msg.caller)) {
      case (#err(e)) {#err(e)};
      case (#ok()) {
        let userDerivationPath = principalToDerivationPath(msg.caller);
        Debug.print("Derivation path for " # Principal.toText(msg.caller) # ": " # userDerivationPath);
        let result = await wallet.generateAddress(?userDerivationPath, null);
        switch (result) {
          case (#ok(addr)) {#ok(addr)};
          case (#err(e)) {
            let errorMsg = switch (e) {
              case (#ValidationError(details)) {details.message};
              case (#NetworkError(details)) {details.message};
              case (#InternalError(details)) {details.message};
              case (_) {"Unknown error generating address"}
            };
            #err(errorMsg)
          }
        }
      }
    }
  };

  // Get balance for any Kaspa address
  public shared (msg) func getBalance(address : Text) : async Result.Result<Wallet.Balance, Text> {
    switch (requireAuth(msg.caller)) {
      case (#err(e)) {#err(e)};
      case (#ok()) {
        let result = await wallet.getBalance(address);
        switch (result) {
          case (#ok(balance)) {#ok(balance)};
          case (#err(e)) {
            let errorMsg = switch (e) {
              case (#ValidationError(details)) {details.message};
              case (#NetworkError(details)) {details.message};
              case (#InternalError(details)) {details.message};
              case (_) {"Unknown error getting balance"}
            };
            #err(errorMsg)
          }
        }
      }
    }
  };

  // Send Kaspa transaction
  public shared (msg) func sendTransaction(
    from_address : Text,
    to_address : Text,
    amount : Nat64
  ) : async Result.Result<Wallet.TransactionResult, Text> {
    switch (requireAuth(msg.caller)) {
      case (#err(e)) {#err(e)};
      case (#ok()) {
        let userDerivationPath = principalToDerivationPath(msg.caller);
        let result = await wallet.sendTransaction(
          from_address,
          to_address,
          amount,
          null, // Use default fee
          ?userDerivationPath // Use user's derivation path for signing
        );
        switch (result) {
          case (#ok(txResult)) {#ok(txResult)};
          case (#err(e)) {
            let errorMsg = switch (e) {
              case (#ValidationError(details)) {details.message};
              case (#NetworkError(details)) {details.message};
              case (#InsufficientFunds(details)) {
                "Insufficient funds: need " # debug_show (details.required) # " but only have " # debug_show (details.available)
              };
              case (#InternalError(details)) {details.message};
              case (_) {"Unknown error sending transaction"}
            };
            #err(errorMsg)
          }
        }
      }
    }
  };

  // Build transaction without broadcasting
  public shared (msg) func buildTransaction(
    from_address : Text,
    to_address : Text,
    amount : Nat64
  ) : async Result.Result<{serialized_tx : Text; fee_paid : Nat64}, Text> {
    switch (requireAuth(msg.caller)) {
      case (#err(e)) {#err(e)};
      case (#ok()) {
        let userDerivationPath = principalToDerivationPath(msg.caller);
        let result = await wallet.buildTransaction(
          from_address,
          to_address,
          amount,
          null, // Use default fee
          ?userDerivationPath // Use user's derivation path for signing
        );
        switch (result) {
          case (#ok(buildResult)) {#ok(buildResult)};
          case (#err(e)) {
            let errorMsg = switch (e) {
              case (#ValidationError(details)) {details.message};
              case (#NetworkError(details)) {details.message};
              case (#InsufficientFunds(details)) {
                "Insufficient funds: need " # debug_show (details.required) # " but only have " # debug_show (details.available)
              };
              case (#InternalError(details)) {details.message};
              case (_) {"Unknown error building transaction"}
            };
            #err(errorMsg)
          }
        }
      }
    }
  };

  // Broadcast a pre-built transaction
  public shared (msg) func broadcastTransaction(serialized_tx : Text) : async Result.Result<Text, Text> {
    switch (requireAuth(msg.caller)) {
      case (#err(e)) {#err(e)};
      case (#ok()) {
        let result = await wallet.broadcastSerializedTransaction(serialized_tx);
        switch (result) {
          case (#ok(txId)) {#ok(txId)};
          case (#err(e)) {
            let errorMsg = switch (e) {
              case (#ValidationError(details)) {details.message};
              case (#NetworkError(details)) {details.message};
              case (#InternalError(details)) {details.message};
              case (_) {"Unknown error broadcasting transaction"}
            };
            #err(errorMsg)
          }
        }
      }
    }
  };

  // Get who is calling (useful for debugging)
  public shared (msg) func whoami() : async Text {
    Principal.toText(msg.caller)
  };

  // Health check
  public func health() : async Text {
    "Kaspa Ninja Wallet is running! 🥷"
  }
}
