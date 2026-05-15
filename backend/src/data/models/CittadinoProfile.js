const { DataTypes } = require('sequelize');

// Profilo cittadino: dati anagrafici 1:1 con un User di ruolo UtenteRegistrato.
// Separa l'identità di login (User) dai dati personali dei cittadini per
// conformità GDPR (dati separati dal backbone auth) e per chiarezza del modello.
module.exports = (sequelize) => sequelize.define('CittadinoProfile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  cognome: { type: DataTypes.STRING, allowNull: false },
  dataNascita: { type: DataTypes.DATEONLY, allowNull: false },
  codiceFiscale: { type: DataTypes.STRING(16), allowNull: false, unique: true },
  interessi: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  // Onboarding: dopo email-verify il cittadino sceglie i suoi interessi.
  // Finché false, dopo il login viene rediretto alla pagina di onboarding.
  onboardingComplete: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'cittadino_profiles',
  timestamps: true,
});
