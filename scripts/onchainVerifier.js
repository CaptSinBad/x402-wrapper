const { ethers } = require('ethers');

// Best-effort on-chain verification helper.
// Returns an object { ok: boolean, reason?: string }
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

  // If tx.to matches payTo, consider it a success
  if (receipt.to && payTo && String(receipt.to).toLowerCase() === payTo) return { ok: true };

  // Otherwise, scan logs for ERC20 Transfer events to payTo
  try {
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    for (const log of receipt.logs || []) {
      if (!log.topics || log.topics.length === 0) continue;
      if (log.topics[0] !== transferTopic) continue;
      // topics[2] is `to` (indexed param). Extract address (last 20 bytes)
      const topicTo = log.topics[2];
      if (!topicTo) continue;
      const addr = ethers.getAddress('0x' + topicTo.slice(-40));
      if (addr && payTo && String(addr).toLowerCase() === payTo) return { ok: true };
    }
  } catch (e) {
    return { ok: false, reason: 'log_parse_error', detail: String(e && e.message) };
  }

  return { ok: false, reason: 'no_matching_transfer' };
}

module.exports = { verifyOnchain };
