class CustomFaq extends HTMLElement {
  constructor() {
    super();
    this.items = this.querySelectorAll('.custom-faq-item');

    this.items.forEach(item => {
        const header = item.querySelector('.custom-faq-item__question');
        header.addEventListener('click', this.onChangeItem.bind(this));
    });
  }

  onChangeItem(e) {
    const selectedItem = e.currentTarget.closest('.custom-faq-item');
    if(selectedItem.classList.contains('active')) return;
    this.items.forEach(item => {
        item.classList.toggle('active', selectedItem == item);
    })
  }
}

customElements.define('custom-faq', CustomFaq);
