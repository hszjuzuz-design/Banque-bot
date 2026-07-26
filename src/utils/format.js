function formatMontant(montant) {
  const symbole = process.env.CURRENCY_SYMBOL || '💰';
  return `${montant.toLocaleString('fr-FR')} ${symbole}`;
}

function formatDuree(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = { formatMontant, formatDuree };
