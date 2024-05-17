// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer'); 
const cors = require('cors');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'YOUR_DATABASE_PASSWORD',
  database: 'DATABASE_NAME',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create Express app
const app = express();
app.use(cors()); 

// Middleware
app.use(bodyParser.json());

// Endpoint to generate password and store in database
app.post('/generate-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Recipient email:', email); // Log recipient email
        
        // Check if email is defined and not empty
        if (!email) {
            console.error('Error: Recipient email is empty or undefined');
            return res.status(400).json({ error: 'Recipient email is empty or undefined' });
        }

        const generatedPassword = generateRandomPassword();
        const expiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

        // Store the generated password and its expiry time in the database
        const connection = await pool.getConnection();
        await connection.query('INSERT INTO passwords (password, expiry_time, email) VALUES (?, ?, ?)', [generatedPassword, expiryTime, email]);
        connection.release();

        console.log('Generated password:', generatedPassword);

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'SENDING_EMAIL',
                pass: 'PASSWORD'
            }
        });

        const mailOptions = {
            from: 'SENDING_EMAIL',
            to: email,
            subject: 'Your Secure Password',
            text: `Your secure password: ${generatedPassword}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ error: 'Internal server error' });
            } else {
                console.log('Email sent:', info.response);
                return res.status(200).json({ message: 'Password sent to email successfully' });
            }
        });
    } catch (error) {
        console.error('Error generating password:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



app.post('/login', async (req, res) => {
    console.log("Hello");
    const { password } = req.body;

    console.log(password);
    if (!password) {
      return res.status(400).send({ error: 'password are required' });
    }
  
    try {
      // Fetch password and expiry time from database
      const connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT * FROM passwords WHERE password = ?', [password]);
      connection.release();
  
      if (rows.length === 0) {
        // Password not found
        return res.status(401).send({ error: 'Invalid email or password' });
      } else {
        const passwordData = rows[0];
        if (new Date(passwordData.expiry_time) < new Date()) {
          // Password expired
          return res.status(401).send({ error: 'Password expired' });
        } else {
          // Password valid
          return res.status(200).send({ message: 'Login successful' });
        }
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      res.status(500).send({ error: 'Internal server error' });
    }
  });
  




app.get('/chatbots', async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT * FROM chatbots');
      connection.release();
  
      res.status(200).send(rows);
    } catch (error) {
      console.error('Error fetching chatbots:', error);
      res.status(500).send({ error: 'Internal server error' });
    }
  });



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



function generateRandomPassword() {
    // Replace this with your own password generation logic
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const passwordLength = 16;
    let password = '';
    for (let i = 0; i < passwordLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    return password;
}