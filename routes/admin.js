const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
    const visitorsFile = path.join(__dirname, '../data/visitors.json');
    
    fs.readFile(visitorsFile, (err, data) => {
        if (err) {
            console.error('Error reading visitors file:', err);
            return res.status(500).send('Server Error');
        }

        const visitors = data ? JSON.parse(data) : [];
        let tableRows = visitors.map(visitor => 
            `<tr><td>${visitor.ip}</td><td>${visitor.timestamp}</td></tr>`
        ).join('');

        res.send(`
            <html>
                <head><title>Admin - Visitor IPs</title></head>
                <body>
                    <h1>Visitor IPs</h1>
                    <table border="1">
                        <thead>
                            <tr><th>IP Address</th><th>Timestamp</th></tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
            </html>
        `);
    });
});

module.exports = router;
