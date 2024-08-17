window.addEventListener('load', function () {
    fetch('/page-loaded', {
        method: 'POST',
    }).then(response => {
        if (response.ok) {
            console.log('Request sent successfully');
        } else {
            console.error('Request failed', response.status);
        }
    }).catch(error => {
        console.error('Error sending request:', error);
    });
});

document.getElementById('enter-text').addEventListener('click', function() {
    const overlay = document.getElementById('overlay');
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.style.display = 'none', 500);
    document.getElementById('audioPlayer').play(); 
});

document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.volume = 0.1; 
});
