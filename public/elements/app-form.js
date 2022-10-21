customElements.define(
  'app-form',
  class extends HTMLElement {
    /**
     * Lifecycle callbacks
     */
    connectedCallback() {
      ['submit'].forEach((name) => {
        this.addEventListener(name, this);
      });
    }

    /**
     * Events
     */

    handleEvent(e) {
      this[`on${e.type}`](e);
    }

    onsubmit(e) {
      e.preventDefault();
    }

    /**
     * Targets
     */

    get formTarget() {
      return this.querySelector('form');
    }

    get inputTargets() {
      return this.formTarget.querySelectorAll(
        'button, input, output, select, textarea'
      );
    }

    /**
     * Props
     */

    get state() {
      const state = {};

      const data = new FormData(this.formTarget);

      for (let [key, val] of data) {
        state[key] = Number.isNaN(+val) ? val : +val;
      }

      return state;
    }

    /**
     * Methods
     */

    checkValidity() {
      return Array.from(this.inputTargets).every((input) =>
        input.checkValidity()
      );
    }

    reportValidity() {
      return Array.from(this.inputTargets).every((input) =>
        input.reportValidity()
      );
    }
  }
);
