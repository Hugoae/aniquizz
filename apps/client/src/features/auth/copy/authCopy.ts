export const AUTH_COPY = {
  passwordHint:
    'Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.',
  passwordInvalid:
    'Le mot de passe doit faire au moins 8 caractères et contenir une majuscule, une minuscule, un chiffre et un caractère spécial.',
  alreadySignedInReset:
    'Tu es déjà connecté. Pour changer de mot de passe, ouvre ton profil (il faudra l’ancien).',
  invalidResetLink:
    'Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.',
  signIn: 'Se connecter',
  profileUnavailable: 'Profil indisponible',
  profileUnavailableHint: 'Profil indisponible — ouvrir pour réessayer',
  modal: {
    login: {
      title: 'CONNEXION',
      description: 'Connectez-vous pour sauvegarder votre progression.',
      submit: 'Se connecter',
      switchPrompt: 'Pas encore de compte ? ',
      switchAction: 'Créer un compte',
      toast: 'Bon retour parmi nous !',
    },
    signup: {
      title: 'INSCRIPTION',
      description: 'Rejoignez la communauté AniQuizz !',
      submit: "S'inscrire",
      switchPrompt: 'Déjà un compte ? ',
      switchAction: 'Se connecter',
      toast: 'Compte créé ! Vérifiez vos emails.',
      legalLead: 'En créant un compte, vous acceptez nos ',
      terms: "conditions d'utilisation",
      legalMid: ' et notre ',
      privacy: 'politique de confidentialité',
      legalEnd: '.',
    },
    forgot: {
      title: 'MOT DE PASSE OUBLIÉ',
      description: 'Entrez votre email pour recevoir un lien de réinitialisation.',
      submit: 'Envoyer le lien',
      back: 'Retour à la connexion',
      toast: "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.",
    },
    fields: {
      username: 'Pseudo',
      usernamePlaceholder: 'OtakuDu93',
      email: 'Email',
      emailPlaceholder: 'exemple@email.com',
      password: 'Mot de passe',
      forgotLink: 'Mot de passe oublié ?',
    },
  },
  errors: {
    generic: 'Impossible de continuer. Réessaie dans un instant.',
    invalidLogin: 'Email ou mot de passe incorrect.',
    emailNotConfirmed: 'Confirme d’abord ton email pour te connecter.',
    alreadyRegistered: 'Un compte existe déjà pour cet email.',
    weakPassword: 'Le mot de passe ne respecte pas les exigences de sécurité.',
    rateLimited: 'Trop de tentatives. Réessaie un peu plus tard.',
    invalidEmail: 'Cette adresse email n’est pas valide.',
    samePassword: 'Le nouveau mot de passe doit être différent de l’ancien.',
    currentPassword: 'Mot de passe actuel incorrect.',
  },
} as const;
