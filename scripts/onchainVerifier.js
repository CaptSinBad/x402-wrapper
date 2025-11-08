const { ethers } = require('ethers');

// Best-effort on-chain verification helper.
// Supports Option A: verify facilitator-provided tx exists and pays the seller.
// If an expectedAmount (string/number) is provided, verify native value or ERC20 Transfer amount matches.
// Returns an object { ok: boolean, reason?: string, details?: any }
async function verifyOnchain(txHash, opts = {}) {
  const rpc = process.env.ONCHAIN_RPC_URL || process.env.ETHEREUM_RPC_URL;
  if (!rpc) {
    return { ok: false, reason: 'no_rpc_configured' };
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  let receipt = null;
  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch (e) {
    return { ok: false, reason: 'receipt_fetch_error', detail: String(e && e.message) };
  }
  if (!receipt) return { ok: false, reason: 'no_receipt' };

  // receipt.status === 1 indicates success on EVM chains
  if (typeof receipt.status === 'number' && receipt.status !== 1) return { ok: false, reason: 'tx_failed' };

  const payTo = opts.payTo ? String(opts.payTo).toLowerCase() : null;
  const expectedAmount = (opts.expectedAmount != null) ? String(opts.expectedAmount) : null; // atomic units string when available

  // Helper to compare BigInt amounts; accepts decimal string or number for expected, receipt values are BigInt
  const amountEquals = (receivedBigInt, expectedStr) => {
    try {
      // normalize expected to BigInt
      const exp = BigInt(expectedStr);
      return BigInt(receivedBigInt) === exp;
    } catch (e) {
      // if parsing fails, treat as non-equal
      return false;
    }
  };

  // If tx.to matches payTo, consider native transfer; check value if expectedAmount provided
  if (receipt.to && payTo && String(receipt.to).toLowerCase() === payTo) {
    if (expectedAmount) {
      // receipt.value is BigInt or hex-like; ethers returns BigInt for value
      const val = receipt.value != null ? receipt.value : receipt.logsBloom; // fallback
      if (val == null) return { ok: false, reason: 'no_value_in_receipt' };
      if (amountEquals(val, expectedAmount)) return { ok: true };
      return { ok: false, reason: 'native_value_mismatch', expected: expectedAmount, got: String(val) };
    }
    return { ok: true };
  }

  // Otherwise, scan logs for ERC20 Transfer events to payTo and (optionally) amount match
  try {
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    for (const log of receipt.logs || []) {
      if (!log.topics || log.topics.length === 0) continue;
      if (log.topics[0] !== transferTopic) continue;
      // topics[2] is `to` (indexed param). Extract address (last 20 bytes)
      const topicTo = log.topics[2];
      if (!topicTo) continue;
      const addr = ethers.getAddress('0x' + topicTo.slice(-40));
      if (!addr || !payTo || String(addr).toLowerCase() !== payTo) continue;

      // parse amount from data (32-byte uint256)
      try {
        const dataHex = log.data && log.data.startsWith('0x') ? log.data.slice(2) : (log.data || '');
        const amountBigInt = dataHex ? BigInt('0x' + dataHex) : BigInt(0);
        if (expectedAmount) {
          if (amountEquals(amountBigInt, expectedAmount)) return { ok: true }; // amount matches
          // otherwise, continue scanning in case other logs match
          continue;
        }
        // no expected amount provided, any ERC20 transfer to payTo is acceptable
        return { ok: true };
      } catch (e) {
        // if parsing fails, continue to next log
        continue;
      }
    }
  } catch (e) {
    return { ok: false, reason: 'log_parse_error', detail: String(e && e.message) };
  }

  return { ok: false, reason: 'no_matching_transfer' };
}

module.exports = { verifyOnchain };
