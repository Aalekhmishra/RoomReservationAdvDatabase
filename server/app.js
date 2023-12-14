// server/app.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Updated$567',
    database: 'room_reservation_system',
});

connection.connect((err) => {

    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database');
});

// ... Add the routes as provided in the previous responses
app.get("/",(req, res)=>{

  res.send(`<h1>Hey the code is workqing</h1>`)
})

app.post('/api/register', (req, res) => {
  const { userType, name, dateOfBirth, email, phone, address, password, major, position } = req.body;
  console.log(`Registration request received`);
  let userTable = '';
  let additionalColumns = '';

  if (userType === 'student') {
    userTable = 'Student';
    additionalColumns = ', Major';
  } else if (userType === 'employee') {
    userTable = 'Employee';
    additionalColumns = ', Position';
  }

  // Get the next available User_Id from the User table
  const getNextUserIdQuery = 'SELECT MAX(User_Id) + 1 AS NextUserId FROM User';
  connection.query(getNextUserIdQuery, (err, result) => {
    if (err) {
      console.error('Error fetching next User_Id:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    const nextUserId = result[0].NextUserId;

    // Use the next available User_Id in both tables
    const insertUserQuery = `INSERT INTO User (User_Id, Name, Date_of_Birth, Email, Phone, Address, Password) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const insertAdditionalQuery = `INSERT INTO ${userTable} (User_Id${additionalColumns}) VALUES (?, ?)`;

    connection.beginTransaction((err) => {
      if (err) {
        throw err;
      }

      connection.query(insertUserQuery, [nextUserId, name, dateOfBirth, email, phone, address, password], (err, result) => {
        if (err) {
          connection.rollback(() => {
            console.error('Error inserting user:', err);
            throw err;
          });
        }

        connection.query(insertAdditionalQuery, [nextUserId, major || position], (err) => {
          if (err) {
            connection.rollback(() => {
              console.error('Error inserting additional info:', err);
              throw err;
            });
          }

          connection.commit((err) => {
            if (err) {
              connection.rollback(() => {
                console.error('Commit error:', err);
                throw err;
              });
            }
            console.log('Registration successful!');
            res.json({ success: true });
          });
        });
      });
    });
  });
});


app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login request received:', { email, password });
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  // Check if the provided email and password match a record in the User table
  connection.query('SELECT * FROM User WHERE Email = ? AND Password = ?', [email, password], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      const userId = user.User_Id;

      // Check if the user exists in the Student or Employee table to determine user_type
      connection.query('SELECT * FROM Student WHERE User_Id = ?', [userId], (err, studentResults) => {
        if (err) {
          console.error('Database query error:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
          return;
        }

        if (studentResults.length > 0) {
          res.json({
            success: true,
            message: 'Login successful',
            user_id: userId,
            user_type: 'student',
          });
        } else {
          // Check in the Employee table
          connection.query('SELECT * FROM Employee WHERE User_Id = ?', [userId], (err, employeeResults) => {
            if (err) {
              console.error('Database query error:', err);
              res.status(500).json({ success: false, message: 'Internal Server Error' });
              return;
            }

            if (employeeResults.length > 0) {
              res.json({
                success: true,
                message: 'Login successful',
                user_id: userId,
                user_type: 'employee',
              });
            } else {
              // Handle the case where the user is not in Student or Employee table
              alert('Incorrect username or password. Please try again.');
              res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
          });
        }
      });
    } else {
      
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  });
});

  // Endpoint for fetching student or employee details based on user type
  app.get('/api/user/:userId', (req, res) => {
    const userId = req.params.userId;
  
    // Query the database to get user name from the User table
    const query = 'SELECT Name FROM User WHERE User_Id = ?';
  
    connection.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
        return;
      }
  
      if (results.length > 0) {
        const userName = results[0].Name;
        res.json({ success: true, userName });
      } else {
        res.status(404).json({ success: false, message: `User with ID ${userId} not found` });
      }
    });
  });
  
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});



// Endpoint for fetching enrolled courses based on user ID
app.get('/api/student/courses/:userId', (req, res) => {
  const userId = req.params.userId;
  console.log('User_id ',userId);
  // Query the database to get enrolled courses for the user from the Enrollment table
  const query = 'SELECT c.* FROM Enrollment e JOIN Course c ON e.Course_Code = c.Course_Code WHERE e.User_Id = ?';

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
      return;
    }

    if (results.length > 0) {
      const courses = results;
      res.json({ success: true, courses });
    } else {
      res.status(404).json({ success: false, message: `No enrolled courses found for user with ID ${userId}` });
    }
  });
});

app.post('/api/roomreservation/:userId', (req, res) => {
  const userId = req.params.userId;
  const {
    email,
    phone,
    roomnumber,
    purpose,
    noofattendees,
    reservationstarttime,
    reservationendtime,
  } = req.body;

  // Get the maximum Booking_ID from the Booking table
  const getMaxBookingIdQuery = 'SELECT MAX(Booking_ID) AS MaxBookingId FROM Booking';
  connection.query(getMaxBookingIdQuery, (err, result) => {
    if (err) {
      console.error('Error fetching max Booking_ID:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    const maxBookingId = result[0].MaxBookingId || 0;
    const newBookingId = maxBookingId + 1;

    const insertBookingQuery = `
  INSERT INTO Booking (Booking_ID, BookedDate, Start_Time, End_Time, Number_Of_Attendees, Email, Phone_Number, Purpose, Room_Number, User_Id)
  VALUES (?, NOW(), STR_TO_DATE(?, '%Y-%m-%dT%H:%i'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i'), ?, ?, ?, ?, ?, ?)
  `;

    connection.query(
      insertBookingQuery,
      [newBookingId, reservationstarttime, reservationendtime, noofattendees, email, phone, purpose, roomnumber, userId],
      (err, result) => {
        if (err) {
          console.error('Error inserting booking:', err);
          return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }

        console.log('Booking successful!');
        res.json({ success: true, message: 'Booking successful!' });
      }
    );
  });
});

// Import necessary modules and configurations

app.get('/api/events', (req, res) => {
  const getEventsQuery = `
    SELECT Room_Number, Start_Time, End_Time, Email
    FROM Booking
    WHERE Purpose = 'Event';
  `;

  connection.query(getEventsQuery, (err, result) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    res.json({ success: true, events: result });
  });
});

// ... (previous imports and configurations)

app.get('/api/roomnumbers', (req, res) => {
  const getRoomNumbersQuery = 'SELECT Room_Number, Room_Capacity FROM Room';
  
  connection.query(getRoomNumbersQuery, (err, result) => {
    if (err) {
      console.error('Error fetching room numbers:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    const rooms = result.map((row) => ({ roomNumber: row.Room_Number, capacity: row.Room_Capacity }));
    res.json({ success: true, rooms });
  });
});

app.get('/api/teaching-courses/:userId', (req, res) => {
  const { userId } = req.params;
  const getTeachingCoursesQuery = `
    SELECT c.Course_Code, c.Course_Name
    FROM Teaching t
    INNER JOIN Course c ON t.Course_Code = c.Course_Code
    WHERE t.User_Id = ?
  `;

  connection.query(getTeachingCoursesQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching teaching courses:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    const teachingCourses = result.map((row) => ({
      courseCode: row.Course_Code,
      courseName: row.Course_Name,
    }));

    res.json({ success: true, teachingCourses });
  });
});

