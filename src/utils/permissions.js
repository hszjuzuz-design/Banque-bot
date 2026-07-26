function estProprietaire(userId) {
  return !!process.env.OWNER_ID && userId === process.env.OWNER_ID;
}

function nomRoleCreateur() {
  return process.env.CREATEUR_ROLE_NAME || 'Créateur';
}

function aRoleCreateur(member) {
  if (!member) return false;
  return member.roles.cache.some((r) => r.name === nomRoleCreateur());
}

function limitesCreateur() {
  return {
    parAction: parseInt(process.env.CREATEUR_LIMITE_PAR_ACTION || '5000', 10),
    quotidienne: parseInt(process.env.CREATEUR_LIMITE_QUOTIDIENNE || '20000', 10),
  };
}

module.exports = { estProprietaire, aRoleCreateur, nomRoleCreateur, limitesCreateur };
