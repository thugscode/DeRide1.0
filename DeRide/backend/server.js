'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const express = require("express");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require("mongoose");
const fs = require('fs');
const RideInfo = require('./model/rideInfo.js');
const User = require("./model/user.js");

mongoose.connect("mongodb://localhost/productDB");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const JWT_SECRET = process.env.JWT_SECRET || 'shhhhh11111';
// #### Update the path to your connection profile as needed.####
const CCP_PATH = '/home/shailesh/Hyperledger/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
const WALLET_PATH = path.join(process.cwd(), 'wallet');

const loadNetworkConfig = () => JSON.parse(fs.readFileSync(CCP_PATH, 'utf8'));

const getWallet = async () => await Wallets.newFileSystemWallet(WALLET_PATH);

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ errorMessage: 'Token is missing!', status: false });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded?.user) {
      return res.status(401).json({ errorMessage: 'User unauthorized!', status: false });
    }
    req.user = decoded;
    next();
  });
};

app.use("/", (req, res, next) => {
  if (["/login", "/register", "/"].includes(req.path)) {
    return next();
  }
  verifyToken(req, res, next);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: true, title: 'Apis' });
});

const checkUserAndGenerateToken = (data, res) => {
  jwt.sign({ user: data.username, id: data._id }, JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
    if (err) {
      res.status(400).json({ status: false, errorMessage: err });
    } else {
      res.json({ message: 'Login Successfully.', token, status: true });
    }
  });
};

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ errorMessage: 'Add proper parameter first!', status: false });
  }

  User.findOne({ username }, (err, data) => {
    if (err || !data || !bcrypt.compareSync(password, data.password)) {
      return res.status(400).json({ errorMessage: 'Username or password is incorrect!', status: false });
    }
    checkUserAndGenerateToken(data, res);
  });
});

app.post('/register', async (req, res) => {
  try {
    const { username, password} = req.body;

    if (!username || !password) {
      return res.status(400).json({ errorMessage: 'Fill user name and password first!', status: false });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ errorMessage: `UserName ${username} Already Exists!`, status: false });
    }

    const ccp = loadNetworkConfig();
    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const ca = new FabricCAServices(caURL);
    const wallet = await getWallet();

    const usernameentity = await wallet.get(username);
    if (usernameentity) {
      return res.status(400).json({ errorMessage: `An identity for the user "${username}" already exists in the wallet`, status: false });
    }

    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      return res.status(400).json({ errorMessage: 'An identity for the admin user "admin" does not exist in the wallet. Run the enrollAdmin.js application before retrying', status: false });
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client' }, adminUser);
    const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });

    const x509Identity = {
      credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put(username, x509Identity);

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('basic');

    
    

    await contract.submitTransaction('CreateUser', username.toString());
    gateway.disconnect();

    res.status(200).json({ status: true, message: `Successfully registered user "${username}" in both Hyperledger Fabric and the database` });
  } catch (error) {
    console.error(`Failed to register user "${req.body.username}": ${error}`);
    res.status(500).json({ errorMessage: `Failed to register user "${req.body.username}": ${error}`, status: false });
  }
});

app.post("/update-user", async (req, res) => {
  try {
    const { source, destination, role, seats, threshold, radius } = req.body;

    if (!source || !destination || !role || !seats || !threshold || !radius) {
      return res.status(400).json({ errorMessage: 'Add proper parameter first!', status: false });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ errorMessage: 'Token is missing!', status: false });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err || !decoded?.user) {
        return res.status(401).json({ errorMessage: 'User unauthorized!', status: false });
      }

      const username = decoded.user;
      const ccp = loadNetworkConfig();
      const wallet = await getWallet();
      const identity = await wallet.get(username);
      if (!identity) {
        return res.status(400).json({ errorMessage: `The user "${username}" is logged out`, status: false });
      }

      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });

      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('basic');

      let result;
      result = await contract.evaluateTransaction('ReadUser', username.toString());
          

      const userData = JSON.parse(result.toString());
      const userToken = userData.Token;

      if (!userToken) {
        return res.status(400).json({ errorMessage: 'User token is undefined', status: false });
      }

      const parsedSeats = parseInt(seats);
      const parsedThreshold = parseInt(threshold);
      const parsedRadius = parseInt(radius);
      const parsedToken = parseInt(userToken);

      if (isNaN(parsedSeats) || isNaN(parsedThreshold) || isNaN(parsedRadius)) {
        return res.status(400).json({ errorMessage: 'Invalid numeric parameters!', status: false });
      }

      let updateSuccess = false;
      let updateAttempts = 0;
      const maxUpdateAttempts = 5;

      console.log('source',source);
      console.log('destination',destination);
      while (!updateSuccess && updateAttempts < maxUpdateAttempts) {
        try {
          await contract.submitTransaction('UpdateUser', username, JSON.stringify(source), JSON.stringify(destination), parsedToken.toString(), role, parsedSeats.toString(), parsedThreshold.toString(), parsedRadius.toString());
          updateSuccess = true;
          console.log('UpdateUser transaction has been submitted');
        } catch (error) {
          updateAttempts++;
          if (updateAttempts >= maxUpdateAttempts) {
        return res.status(500).json({ errorMessage: 'Failed! Please Submit your ride details again.', status: false });
          }
        }
      }

      gateway.disconnect();

      res.status(200).json({ status: true, title: 'Ride details updated! Please wait 3 minutes for your ride.' });

      (async () => {
        const gateway1 = new Gateway();
        await gateway1.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });

        const network1 = await gateway1.getNetwork('mychannel');
        const contract1 = network1.getContract('basic');

        const noOfUser = await contract1.evaluateTransaction('GetNumberOfUsers');
        const numberOfUsers = JSON.parse(noOfUser.toString());
        if (numberOfUsers > 1) {
          let transactionSuccess = false;
          let transactionAttempts = 0;
          const maxTransactionAttempts = 5;

          while (!transactionSuccess && transactionAttempts < maxTransactionAttempts) {
            try {
                  await contract1.submitTransaction('MatrixCalculation');
                  await new Promise(resolve => setTimeout(resolve, 4000));
                  const ERStateBytes = await contract1.evaluateTransaction('getEligibilityMatrix');
                  if (ERStateBytes && ERStateBytes.length > 0) {
                    await contract1.submitTransaction('DoAssignment');
                    await new Promise(resolve => setTimeout(resolve, 1000)); 
                    console.log('DoAssignment transaction has been submitted');
                  }
                  transactionSuccess = true;
                  
            } catch (error) {
                transactionAttempts++;
            }
          }
        }

        gateway1.disconnect();
      })();

    });
  } catch (e) {
    res.status(400).json({ errorMessage: 'Something went wrong!', status: false });
  }
});

app.post("/update-database", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ errorMessage: 'Token is missing!', status: false });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err || !decoded?.user) {
        return res.status(401).json({ errorMessage: 'User unauthorized!', status: false });
      }

      const username = decoded.user;
      const ccp = loadNetworkConfig();
      const wallet = await getWallet();
      const identity = await wallet.get(username);
      if (!identity) {
        return res.status(400).json({ errorMessage: `The user "${username}" is logged out`, status: false });
      }

      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });

      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('basic');

      let result;
      result = await contract.evaluateTransaction('ReadUser', username.toString());
       
      const userData = JSON.parse(result.toString());

      if (!userData.Driver) {
        userData.Driver = username;
      }

      if (typeof userData.Driver === 'object') {
        userData.Driver = JSON.stringify(userData.Driver);
      }

      const formattedRiders = userData.Riders ? userData.Riders.map(rider => {
        const [user, details] = Object.entries(rider)[0];
        const { Destination, Source } = details;
        return {
          user,
          Destination: { lat: Destination.lat, lng: Destination.lng },
          Source: { lat: Source.lat, lng: Source.lng }
        };
      }) : [];

      const newRideInfo = new RideInfo({
        ...userData,
        Riders: formattedRiders,
        Date: new Date(),
        Time: new Date().toLocaleTimeString()
      });

      await newRideInfo.save();
      res.status(200).json({ status: true, message: 'Ride info updated successfully!' });

      gateway.disconnect();
    });
  } catch (error) {
    res.status(500).json({ errorMessage: `Failed to update in database ${error}`, status: false });
  }
});

app.get('/GetAllUsers', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ errorMessage: 'Token is missing!', status: false });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err || !decoded?.user) {
        return res.status(401).json({ errorMessage: 'User unauthorized!', status: false });
      }

      const username = decoded.user;
      const ccp = loadNetworkConfig();
      const wallet = await getWallet();
      const identity = await wallet.get(username);
      if (!identity) {
        return res.status(400).json({ errorMessage: `The user "${username}" is logged out`, status: false });
      }

      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });

      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('basic');

      const result = await contract.evaluateTransaction('GetAllUsers');
      gateway.disconnect();

      res.status(200).json({ status: true, result: JSON.parse(result.toString()) });
    });
  } catch (error) {
    res.status(500).json({ errorMessage: `Failed to evaluate transaction: ${error}`, status: false });
  }
});

app.get('/history-rides', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ errorMessage: 'Token is missing!', status: false });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err || !decoded?.user) {
        return res.status(401).json({ errorMessage: 'User unauthorized!', status: false });
      }

      const username = decoded.user;
      const rides = await RideInfo.find({ ID: username });
      res.status(200).json({ status: true, rides });
    });
  } catch (error) {
    res.status(500).json({ errorMessage: `Failed to fetch history rides: ${error}`, status: false });
  }
});


app.get('/GetUser', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ errorMessage: 'Token is missing!', status: false });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err || !decoded?.user) {
        return res.status(401).json({ errorMessage: 'User unauthorized!', status: false });
      }

      const username = decoded.user;
      const ccp = loadNetworkConfig();
      const wallet = await getWallet();
      const identity = await wallet.get(username);
      if (!identity) {
        return res.status(400).json({ errorMessage: `The user "${username}" is logged out`, status: false });
      }

      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });

      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('basic');

      const result = await contract.evaluateTransaction('ReadUser', username);
      gateway.disconnect();

      res.status(200).json({ status: true, result: JSON.parse(result.toString()) });
    });
  } catch (error) {
    res.status(500).json({ errorMessage: `Failed to evaluate transaction: ${error}`, status: false });
  }
});

app.listen(2000, () => {
  console.log("Server is Running On port 2000");
});