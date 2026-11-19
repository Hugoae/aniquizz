import { tx } from '@/lib/i18n/text';

const s = (key: string) => tx('auth', key);

export const AUTH_COPY = {
  get passwordHint() {
    return s('passwordHint');
  },
  get passwordInvalid() {
    return s('passwordInvalid');
  },
  get alreadySignedInReset() {
    return s('alreadySignedInReset');
  },
  get invalidResetLink() {
    return s('invalidResetLink');
  },
  get signIn() {
    return s('signIn');
  },
  get profileUnavailable() {
    return s('profileUnavailable');
  },
  get profileUnavailableHint() {
    return s('profileUnavailableHint');
  },
  modal: {
    login: {
      get title() {
        return s('modal.login.title');
      },
      get description() {
        return s('modal.login.description');
      },
      get submit() {
        return s('modal.login.submit');
      },
      get switchPrompt() {
        return s('modal.login.switchPrompt');
      },
      get switchAction() {
        return s('modal.login.switchAction');
      },
      get toast() {
        return s('modal.login.toast');
      },
    },
    signup: {
      get title() {
        return s('modal.signup.title');
      },
      get description() {
        return s('modal.signup.description');
      },
      get submit() {
        return s('modal.signup.submit');
      },
      get switchPrompt() {
        return s('modal.signup.switchPrompt');
      },
      get switchAction() {
        return s('modal.signup.switchAction');
      },
      get toast() {
        return s('modal.signup.toast');
      },
      get legalLead() {
        return s('modal.signup.legalLead');
      },
      get terms() {
        return s('modal.signup.terms');
      },
      get legalMid() {
        return s('modal.signup.legalMid');
      },
      get privacy() {
        return s('modal.signup.privacy');
      },
      get legalEnd() {
        return s('modal.signup.legalEnd');
      },
    },
    forgot: {
      get title() {
        return s('modal.forgot.title');
      },
      get description() {
        return s('modal.forgot.description');
      },
      get submit() {
        return s('modal.forgot.submit');
      },
      get back() {
        return s('modal.forgot.back');
      },
      get toast() {
        return s('modal.forgot.toast');
      },
    },
    fields: {
      get username() {
        return s('modal.fields.username');
      },
      get usernamePlaceholder() {
        return s('modal.fields.usernamePlaceholder');
      },
      get email() {
        return s('modal.fields.email');
      },
      get emailPlaceholder() {
        return s('modal.fields.emailPlaceholder');
      },
      get password() {
        return s('modal.fields.password');
      },
      get forgotLink() {
        return s('modal.fields.forgotLink');
      },
    },
  },
  errors: {
    get generic() {
      return s('errors.generic');
    },
    get invalidLogin() {
      return s('errors.invalidLogin');
    },
    get emailNotConfirmed() {
      return s('errors.emailNotConfirmed');
    },
    get alreadyRegistered() {
      return s('errors.alreadyRegistered');
    },
    get weakPassword() {
      return s('errors.weakPassword');
    },
    get rateLimited() {
      return s('errors.rateLimited');
    },
    get invalidEmail() {
      return s('errors.invalidEmail');
    },
    get samePassword() {
      return s('errors.samePassword');
    },
    get currentPassword() {
      return s('errors.currentPassword');
    },
  },
};
