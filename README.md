# DeRide: An Incentivized Peer-to-Peer Ride Sharing Service

[![IEEE BCCA 2025](https://img.shields.io/badge/IEEE%20BCCA-2025-blue)](https://ieeexplore.ieee.org)
[![IEEE CIC 2025](https://img.shields.io/badge/IEEE%20CIC-2025-green)](https://ieeexplore.ieee.org)
[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger-Fabric-orange)](https://hyperledger-fabric.readthedocs.io/)
[![MERN Stack](https://img.shields.io/badge/Stack-MERN-purple)](https://www.mongodb.com/mern-stack)

## 📊 Published Research

This project implements the research published in:

1. **"DeRide: An Incentivized Peer-to-Peer Ride Sharing Service using Permissioned Blockchain Networks"** - IEEE BCCA 2025
2. **"RideCred: A Decentralized and Incentive-Driven Ride-Sharing System with Trustless Coordination"** - IEEE CIC 2025

## � Overview

DeRide is a decentralized, incentive-driven ride-sharing platform built on Hyperledger Fabric that enables secure, transparent, and efficient peer-to-peer transportation services. The system leverages blockchain technology to eliminate the need for centralized authorities while ensuring trust, transparency, and fair compensation through an innovative token-based incentive mechanism.

### 🌟 Key Features

- **Decentralized Architecture**: Built on Hyperledger Fabric permissioned blockchain
- **Smart Matching Algorithm**: Intelligent driver-rider pairing based on location, capacity, and preferences
- **Token-Based Incentives**: Blockchain-native tokens for rewards and payments
- **Trustless Coordination**: Eliminates need for centralized ride-sharing authorities
- **Real-time Path Optimization**: Google Maps API integration for optimal route planning
- **Transparent Operations**: All transactions recorded immutably on the blockchain
- **Fair Assignment**: Randomized selection mechanism for equitable ride distribution

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│   (React.js)    │◄──►│   (Node.js)     │◄──►│ (Hyperledger    │
│                 │    │                 │    │    Fabric)      │
│ • User Interface│    │ • API Gateway   │    │ • Smart         │
│ • Google Maps   │    │ • Authentication│    │   Contracts     │
│ • Real-time UI  │    │ • MongoDB       │    │ • Consensus     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: React.js, Material-UI, Google Maps API
- **Backend**: Node.js, Express.js, MongoDB, JWT Authentication
- **Blockchain**: Hyperledger Fabric, JavaScript Chaincode
- **Database**: MongoDB (off-chain data), CouchDB (blockchain state)
- **APIs**: Google Maps Directions & Distance Matrix API

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (v4.4 or higher)
- **Docker** and **Docker Compose**
- **Hyperledger Fabric** (v2.2 or higher)
- **Git**
- **Google Maps API Key**

### Hyperledger Fabric Installation

Follow the official installation guide:
```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s
```

Detailed instructions: [Hyperledger Fabric Installation](https://hyperledger-fabric.readthedocs.io/en/latest/install.html)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DeRide
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Chaincode Setup

```bash
cd ../chaincode/javascript
npm install
```

### 5. Configure Google Maps API

1. Obtain a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Maps JavaScript API
   - Directions API
   - Distance Matrix API
3. Update the API key in:
   - `chaincode/javascript/lib/rideSharing.js` (line with `const apiKey`)
   - Frontend Google Maps configuration

### 6. Configure MongoDB

Start MongoDB service:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 7. Configure Hyperledger Fabric Paths

Update the following paths in the project files according to your system:

**In `backend/server.js`:**
```javascript
const CCP_PATH = '/path/to/your/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
```

**In `startFabric.sh`:**
```bash
CC_SRC_PATH="/path/to/your/DeRide/chaincode/javascript/"
pushd /path/to/your/fabric-samples/test-network
```

## 🚀 Running the Application

### 1. Start Hyperledger Fabric Network

```bash
# Make the script executable
chmod +x startFabric.sh

# Start the Fabric network and deploy chaincode
./startFabric.sh
```

This script will:
- Clean previous network instances
- Start the Fabric test network with CA and CouchDB
- Deploy the DeRide chaincode
- Set up the necessary channels and peers

### 2. Enroll Admin User

```bash
cd backend
node enrollAdmin.js
```

### 3. Start Backend Server

```bash
cd backend
npm start
# Or
node server.js
```

The backend server will start on `http://localhost:2000`

### 4. Start Frontend Application

```bash
cd frontend
npm start
```

The frontend application will start on `http://localhost:3000`

## 💡 How It Works

### User Registration & Authentication

1. **Registration**: Users register through the web interface
2. **Blockchain Identity**: Each user gets a blockchain identity in Hyperledger Fabric
3. **Token Allocation**: New users receive initial tokens (10 tokens)
4. **JWT Authentication**: Secure session management

### Ride Request Process

1. **Role Selection**: User chooses to be a driver or rider
2. **Location Input**: Enter source and destination using Google Maps
3. **Preferences**: Set capacity (drivers), threshold distance, and search radius
4. **Blockchain Submission**: Ride details stored on blockchain

### Intelligent Matching Algorithm

1. **Eligibility Matrix**: System calculates compatibility between drivers and riders
2. **Path Analysis**: Uses Google Maps API to determine optimal routes
3. **Constraint Satisfaction**: Considers distance thresholds, capacity, and proximity
4. **Fair Selection**: Randomized assignment for equal opportunity

### Token Economy

- **Drivers**: Earn +2 tokens per ride completion
- **Riders**: Pay -2 tokens per ride
- **Incentive**: Encourages balanced driver/rider participation

## 🔧 API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - User login

### Ride Management
- `POST /update-user` - Submit ride request
- `GET /GetUser` - Get current user data
- `POST /update-database` - Update ride history

### Data Retrieval
- `GET /history-rides` - Get user's ride history
- `GET /GetAllUsers` - Get all users (admin)

## 🧪 Testing

### Run Chaincode Tests

```bash
cd chaincode/javascript
npm test
```

### Manual Testing Scenarios

1. **Register Multiple Users**: Create at least 2 users (1 driver, 1 rider)
2. **Submit Ride Requests**: Test various source/destination combinations
3. **Verify Matching**: Check blockchain logs for successful assignments
4. **Token Verification**: Confirm token transfers after ride completion

## 📱 User Interface

### Dashboard Features

- **Real-time Map**: Interactive Google Maps integration
- **Route Visualization**: Display optimal paths and ride assignments
- **Token Balance**: Live token count display
- **Ride History**: Complete transaction history
- **Status Updates**: Real-time assignment notifications

### Mobile Responsiveness

The interface is fully responsive and optimized for:
- Desktop browsers
- Tablet devices
- Mobile phones

## 🔒 Security Features

- **Permissioned Blockchain**: Controlled access through Hyperledger Fabric
- **JWT Authentication**: Secure API access
- **Input Validation**: Comprehensive data sanitization
- **Transaction Integrity**: Cryptographic security for all blockchain operations

## 📊 Performance Considerations

- **Scalability**: Handles multiple concurrent users
- **Optimization**: Efficient pathfinding algorithms
- **Caching**: Strategic use of blockchain state queries
- **Error Handling**: Robust retry mechanisms for network operations

## 🐛 Troubleshooting

### Common Issues

1. **Fabric Network Won't Start**
   ```bash
   # Clean up previous networks
   cd /path/to/fabric-samples/test-network
   ./network.sh down
   docker system prune -f
   ```

2. **MongoDB Connection Error**
   ```bash
   sudo systemctl restart mongod
   ```

3. **Google Maps API Issues**
   - Verify API key validity
   - Check API quotas and billing
   - Ensure required APIs are enabled

4. **Chaincode Deployment Fails**
   - Check chaincode path in `startFabric.sh`
   - Verify Node.js version compatibility
   - Review chaincode dependencies

### Logs and Debugging

- **Backend Logs**: Check Node.js console output
- **Fabric Logs**: Use `docker logs <container_name>`
- **Frontend Logs**: Browser developer console
- **Chaincode Logs**: Check peer container logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 📚 Research Citations

If you use this project in your research, please cite:

```bibtex
@inproceedings{deride2025,
  title={DeRide: An Incentivized Peer-to-Peer Ride Sharing Service using Permissioned Blockchain Networks},
  author={Shailesh Kumar Sharma and Sandip Chakraborty and Balaji Palanisamy and Shamik Sural},
  booktitle={IEEE BCCA 2025}
}

@inproceedings{ridecred2025,
  title={RideCred: A Decentralized and Incentive-Driven Ride-Sharing System with Trustless Coordination},
  author={Shailesh Kumar Sharma and Balaji Palanisamy and Shamik Sural and Sandip Chakraborty},
  booktitle={IEEE CIC 2025}
}
```

## 👥 Authors

### IEEE BCCA 2025 - "DeRide: An Incentivized Peer-to-Peer Ride Sharing Service using Permissioned Blockchain Networks"

**Shailesh Kumar Sharma**¹, **Sandip Chakraborty**¹, **Balaji Palanisamy**², **Shamik Sural**¹

¹Indian Institute of Technology Kharagpur, India  
²University of Pittsburgh, USA

### IEEE CIC 2025 - "RideCred: A Decentralized and Incentive-Driven Ride-Sharing System with Trustless Coordination"

**Shailesh Kumar Sharma**¹, **Balaji Palanisamy**², **Shamik Sural**¹, **Sandip Chakraborty**¹

¹Indian Institute of Technology Kharagpur, India  
²University of Pittsburgh, USA

## 🎯 Future Enhancements

- **Multi-modal Transportation**: Support for bikes, scooters, public transit
- **Dynamic Pricing**: Smart contract-based fare calculation
- **Reputation System**: User rating and feedback mechanism
- **Carbon Credits**: Environmental impact tracking and rewards
- **Cross-chain Integration**: Interoperability with other blockchain networks

## 📧 Support

For technical support or questions about the research:

- **Primary Contact**: Shailesh Kumar Sharma (shaileshKsharma12@gmail.com)
- **Research Supervisor**: Prof. Sandip Chakraborty AND Prof. Shamik Sural.
- **Collaborators**: 
  - Prof. Balaji Palanisamy, University of Pittsburgh.

- Create an issue in this repository for technical problems
- **Institution**: Indian Institute of Technology Kharagpur, India

---

**Built with ❤️ using Hyperledger Fabric and the MERN Stack**

