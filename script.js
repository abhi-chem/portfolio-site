document.addEventListener('DOMContentLoaded', () => {
  // Page Transition Fade In
  const transitionEl = document.querySelector('.page-transition');
  if (transitionEl) {
    setTimeout(() => {
      transitionEl.classList.add('loaded');
    }, 100);
  }

  // Handle link clicks for Fade Out
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', e => {
      // Only transition internal links
      if (link.hostname === window.location.hostname && !link.target && !link.hasAttribute('download')) {
        e.preventDefault();
        const target = link.href;
        if (transitionEl) {
          transitionEl.classList.remove('loaded');
          setTimeout(() => {
            window.location.href = target;
          }, 400); // Wait for transition
        } else {
          window.location.href = target;
        }
      }
    });
  });

  // Highlight Active Nav Link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) {
      link.classList.add('active');
    }
  });

  // Scroll Reveal Animation
  const reveals = document.querySelectorAll('.reveal');
  const revealOnScroll = () => {
    reveals.forEach(el => {
      const windowHeight = window.innerHeight;
      const elementTop = el.getBoundingClientRect().top;
      const elementVisible = 100;

      if (elementTop < windowHeight - elementVisible) {
        el.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Trigger on load
});