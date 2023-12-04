const express = require('express');
const session = require('express-session');
const http = require('http');
const app = express();
const socketIO = require('socket.io');
const server = http.createServer(app);
require('dotenv').config();


//session setup
app.use(session({
    secret: 'ekweori324ijfg230',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.use(express.static(__dirname));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Routers
app.use('/', require('./routes/account'))
app.use('/dashboard', require('./routes/home'))


const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const io = socketIO(server)

io.on('connection', (socket) => {
    const users = {}
    socket.on('join-room', (data) => {
        const userId = data
        users[userId] = {socketId: socket.id}
        console.log("----------");
        console.log(users);
    })
})