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