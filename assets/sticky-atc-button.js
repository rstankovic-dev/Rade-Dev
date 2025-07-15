class StickyAtcButton extends HTMLElement {
  constructor() {
    super();
    this.variantSelector = this.querySelector('.sticky-atc-id-selector');
    this.priceElement = this.querySelector('.sticky-atc-price');
    this.form = this.querySelector('.sticky-atc-form');
    this.productInfo = document.querySelector('product-info');
    this.submitButton = this.querySelector('[type="submit"]');
    this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
    this.onChangeVariant = this.onChangeVariant.bind(this);
    this.variantSelector.addEventListener('change', this.onChangeVariant);
    this.onSubmitHandler = this.onSubmitHandler.bind(this);
    this.form.addEventListener('submit', this.onSubmitHandler);
  }

  connectedCallback() {
    const _this = this;
    if (this.productInfo) {
      const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                _this.classList.remove('active');
              } else {
                _this.classList.add('active');
              }
          });
      }, {
          root: null,
          rootMargin: '0px 0px -100px 0px',
          threshold: 0.5,
      });

      observer.observe(_this.productInfo);
    } else {
      console.error("product-info element not found");
    }
  }

  onChangeVariant() {
    const variantId = this.variantSelector.value;
    const price = this.variantSelector.querySelector(`[value="${variantId}"]`).dataset.price;
    this.priceElement.textContent = price;
  }

  onSubmitHandler(evt) {
    evt.preventDefault();
    if (this.submitButton.getAttribute('aria-disabled') === 'true') return;
    this.submitButton.setAttribute('aria-disabled', true);
    this.submitButton.classList.add('loading');
    this.querySelector('.loading__spinner').classList.remove('hidden');

    const quantity = this.productInfo.querySelector('.quantity__input').value || 1

    const config = fetchConfig('javascript');
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type'];

    const formData = new FormData(this.form);
    formData.append('quantity', quantity);
    if (this.cart) {
        formData.append(
        'sections',
        this.cart.getSectionsToRender().map((section) => section.id)
        );
        formData.append('sections_url', window.location.pathname);
        this.cart.setActiveElement(document.activeElement);
    }
    config.body = formData;

    fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
            if (response.status) {
                publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
                });

                const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
                if (!soldOutMessage) return;
                this.submitButton.setAttribute('aria-disabled', true);
                this.submitButtonText.classList.add('hidden');
                soldOutMessage.classList.remove('hidden');
                this.error = true;
                return;
            } else if (!this.cart) {
                window.location = window.routes.cart_url;
                return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
                publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
                }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
                });
            this.error = false;
            CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
            });
        })
        .catch((e) => {
            console.error(e);
        })
        .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');

            CartPerformance.measureFromEvent("add:user-action", evt);
        });
  }
}

customElements.define('sticky-atc-button', StickyAtcButton);
