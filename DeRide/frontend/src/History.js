import React, { Component } from 'react';
import {
    Button, LinearProgress,
    TableBody, Table,
    TableContainer, TableHead, TableRow, TableCell,
    Card, Dialog, DialogTitle, DialogContent, DialogActions
} from '@material-ui/core';
import { Pagination } from '@material-ui/lab';
import swal from 'sweetalert';
import { VscAccount } from "react-icons/vsc";
import { BiSolidCoinStack } from "react-icons/bi";
import { withRouter } from './utils';

const axios = require('axios');

class Dashboard extends Component {
    constructor() {
        super();
        this.state = {
            token: '',
            page: 1,
            loading: false,
            userData: null,
            ridesData: [],
            dialogOpen: false,
            dialogData: null
        };
    }

    componentDidMount = () => {
        let token = sessionStorage.getItem('token');
        if (!token) {
            this.props.navigate("/login");
        } else {
            this.setState({ token: token });
            this.fetchUserData(token);
            this.fetchRidesData(token);
        }
    }

    fetchUserData = (token) => {
        axios.get('http://localhost:2000/GetUser', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'content-type': 'application/json'
            }
        }).then((res) => {
            this.setState({ userData: res.data.result });
        }).catch((err) => {
            swal({
                text: err.response.data.errorMessage,
                icon: "error",
                type: "error"
            });
        });
    }

    getAddress = (location, type) => {
    const { lat, lng } = location; // Destructure lat and lng from the location object
    const geocoder = new window.google.maps.Geocoder();
    const latLng = { lat: parseFloat(lat), lng: parseFloat(lng) };
  
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK') {
        if (results[0] && type === 'source') {
          this.setState({ source: results[0].formatted_address });
        } else if(results[0] && type === 'destination') {
          this.setState({ destination: results[0].formatted_address });
        }
      } else {
        this.setState({ address: 'Geocode failed due to: ' + status });
      }
    });
  };

    fetchRidesData = (token) => {
        axios.get('http://localhost:2000/history-rides', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'content-type': 'application/json'
            }
        }).then((res) => {
            const sortedRides = res.data.rides.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            this.setState({ ridesData: sortedRides });
        }).catch((err) => {
            swal({
                text: err.response.data.errorMessage,
                icon: "error",
                type: "error"
            });
        });
    }

    logOut = () => {
        sessionStorage.setItem('token', null);
        this.props.navigate("/");
    }

    handleDialogOpen = (data) => {
        let formattedData;
    
        if (Array.isArray(data)) {
            // Handle Riders data
            formattedData = data.map((item) => ({
                user: item.user,
                source: item.Source,
                destination: item.Destination,
            }));
        } else if (typeof data === "string") {
            try {
                // Handle Driver data (parse string)
                const parsedData = JSON.parse(data);
                formattedData = {
                    user: parsedData.ID,
                    source: parsedData.Source,
                    destination: parsedData.Destination,
                };
            } catch (e) {
                console.error("Failed to parse data", e);
                formattedData = data;
            }
        } else {
            formattedData = data;
        }
    
        this.setState({ dialogOpen: true, dialogData: formattedData });
    };
    

    handleDialogClose = () => {
        this.setState({ dialogOpen: false, dialogData: null });
    }

    getPaginatedData = () => {
        const { page, ridesData } = this.state;
        const startIndex = (page - 1) * 7;
        const endIndex = startIndex + 7;
        return ridesData.slice(startIndex, endIndex);
    }
    
    render() {
        return (
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {this.state.loading && <LinearProgress size={40} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>History</h2>
                {this.state.userData && (
                <Card style={{ textAlign: 'left', padding: '5px' }}>
                 <h3><VscAccount /> : {this.state.userData.ID} | <BiSolidCoinStack /> : {this.state.userData.Token}</h3>
                </Card>
                )}
                <div>
                <Button
                    className="button_style"
                    variant="contained"
                    size="small"
                    style={{ backgroundColor: '#4CAF50', color: 'white' }}
                    onClick={() => this.props.navigate("/dashboard")}
                >
                    Book a Ride
                </Button>
                <Button
                    className="button_style"
                    variant="contained"
                    size="small"
                    style={{ backgroundColor: 'red', color: 'white', marginRight: '10px' }}
                    onClick={this.logOut}
                >
                    Log Out
                </Button>
                </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
                <div style={{ flex: 1, marginLeft: '10px' }}>
                    <br />
                    <div style={{ border: '5px solid #4CAF50', borderRadius: '10px', padding: '10px' }}>
                    <TableContainer>
                        <Table aria-label="simple table">
                        <TableHead>
                            <TableRow>
                            <TableCell align="center"><strong>Date</strong></TableCell>
                            <TableCell align="center"><strong>Time</strong></TableCell>
                            <TableCell align="center"><strong>Role</strong></TableCell>
                            <TableCell align="center"><strong>Source</strong></TableCell>
                            <TableCell align="center"><strong>Destination</strong></TableCell>
                            <TableCell align="center"><strong>Driver/Rider</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.getPaginatedData().map((ride, index) => (
                            <TableRow key={index}>
                                <TableCell align="center">{new Date(ride.Date).toLocaleDateString()}</TableCell>
                                <TableCell align="center">{ride.Time}</TableCell>
                                <TableCell align="center">{ride.Role}</TableCell>
                                <TableCell align="center">{ride.Source.lat}, {ride.Source.lng}</TableCell>
                                <TableCell align="center">{ride.Destination.lat}, {ride.Destination.lng}</TableCell>
                                <TableCell align="center">
                                <Button
                                    variant="contained"
                                    size="small"
                                    style={{ backgroundColor: '#37474F', color: 'white' }}
                                    onClick={() => this.handleDialogOpen(ride.Role === 'driver' ? ride.Riders : ride.Driver)}
                                >
                                    {ride.Role === 'driver' ? 'Riders' : 'Driver'}
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                        <br />
                        <br />
                        <Pagination
                        count={Math.ceil(this.state.ridesData.length / 7)}
                        page={this.state.page}
                        onChange={(event, value) => this.setState({ page: value })}
                        color="primary"
                        />
                    </TableContainer>
                    </div>
                </div>
                </div>
            </div>
            <Dialog open={this.state.dialogOpen} onClose={this.handleDialogClose}>
                <DialogTitle>Details</DialogTitle>
                <DialogContent>
                <pre>
                    {Array.isArray(this.state.dialogData)
                    ? this.state.dialogData
                        .map((item) => 
                        `User: ${item.user}, Source: ${item.source.lat}, ${item.source.lng}, Destination: ${item.destination.lat}, ${item.destination.lng}`)
                        .join('\n')
                    : (this.state.dialogData && this.state.dialogData.user 
                        ? `User: ${this.state.dialogData.user}, Source: ${this.state.dialogData.source.lat}, ${this.state.dialogData.source.lng}, Destination: ${this.state.dialogData.destination.lat}, ${this.state.dialogData.destination.lng}`
                        : 'No data available')}
                </pre>
                </DialogContent>
                <DialogActions>
                <Button onClick={this.handleDialogClose} color="primary">
                    Close
                </Button>
                </DialogActions>
            </Dialog>
            </div>
        );
    }
}

export default withRouter(Dashboard);
