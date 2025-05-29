// Mobile responsive functionality for ChatterBox

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements for mobile responsiveness
  const leftSidebar = document.querySelector('.left_sidebar');
  const rightSidebar = document.querySelector('.right_sidebar');
  const leftSidebarToggle = document.getElementById('left-sidebar-toggle');
  const rightSidebarToggle = document.getElementById('right-sidebar-toggle');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // Function to toggle left sidebar
  function toggleLeftSidebar() {
    leftSidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    
    // Close right sidebar if it's open
    if (rightSidebar.classList.contains('active')) {
      rightSidebar.classList.remove('active');
    }
  }

  // Function to toggle right sidebar
  function toggleRightSidebar() {
    rightSidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    
    // Close left sidebar if it's open
    if (leftSidebar.classList.contains('active')) {
      leftSidebar.classList.remove('active');
    }
  }

  // Function to close all sidebars
  function closeSidebars() {
    leftSidebar.classList.remove('active');
    rightSidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  }

  // Event listeners for mobile sidebar toggles
  if (leftSidebarToggle) {
    leftSidebarToggle.addEventListener('click', toggleLeftSidebar);
  }

  if (rightSidebarToggle) {
    rightSidebarToggle.addEventListener('click', toggleRightSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebars);
  }

  // Close sidebars when clicking on a room or friend in mobile view
  const roomCards = document.querySelectorAll('.room_card');
  const userCards = document.querySelectorAll('.user_card');

  roomCards.forEach(card => {
    card.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        closeSidebars();
      }
    });
  });

  userCards.forEach(card => {
    card.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        closeSidebars();
      }
    });
  });

  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      // Reset sidebar positions for desktop view
      leftSidebar.classList.remove('active');
      rightSidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    }
  });

  // Add touch event handling for swipe gestures
  let touchStartX = 0;
  let touchEndX = 0;
  
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
  }, false);
  
  document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);
  
  function handleSwipe() {
    const swipeThreshold = 100; // Minimum distance for a swipe
    
    // Swipe right to open left sidebar
    if (touchEndX - touchStartX > swipeThreshold && window.innerWidth <= 768) {
      if (!leftSidebar.classList.contains('active') && !rightSidebar.classList.contains('active')) {
        toggleLeftSidebar();
      }
    }
    
    // Swipe left to open right sidebar
    if (touchStartX - touchEndX > swipeThreshold && window.innerWidth <= 768) {
      if (!rightSidebar.classList.contains('active') && !leftSidebar.classList.contains('active')) {
        toggleRightSidebar();
      }
    }
  }
});
