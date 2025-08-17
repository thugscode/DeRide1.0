
'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');
const axios = require('axios');
const polyline = require('@mapbox/polyline');

class rideSharing extends Contract {
    
    async CreateUser(ctx, id) {
        try {
            if (!id || typeof id !== 'string') throw new Error("Invalid ID");
        
            const exists = await this.UserExists(ctx, id);
            if (exists) {
                throw new Error(`The user ${id} already exists`);
            }
        
            const user = {
                ID: id,
                Source: {
                    lat: 0,
                    lng: 0
                },
                Destination: {
                    lat: 0,
                    lng: 0
                },
                Token: 10,
                Role: '',
                Seats: 0,
                Riders: [],
                Path: [],
                Driver: '',
                Threshold: 0,
                Radius: 0,
                Assigned: false
            };
            console.log('User Created:', user);
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(user))));
            return JSON.stringify(user);
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }


    // UpdateUser updates an existing user in the world state with provided parameters.
    async UpdateUser(ctx, id, Source, Destination, token, role, seats, threshold, radius) {
        try {
            if (!id || typeof id !== 'string') throw new Error("Invalid ID");
            if (!Source || typeof Source !== 'string' || !this.isValidJSON(Source)) throw new Error("Invalid Source");
            if (!Destination || typeof Destination !== 'string' || !this.isValidJSON(Destination)) throw new Error("Invalid Destination");
        
            // Parse numeric arguments
            token = parseInt(token);
            seats = parseInt(seats);
            threshold = parseInt(threshold);
            radius = parseInt(radius);
        
            if (isNaN(token)) throw new Error("Invalid Token");
            if (!role || typeof role !== 'string') throw new Error("Invalid Role");
            if (isNaN(seats)) throw new Error("Invalid Seats");
            if (isNaN(threshold)) throw new Error("Invalid Threshold");
            if (isNaN(radius)) throw new Error("Invalid Radius");
    
            const exists = await this.UserExists(ctx, id);
            if (!exists) {
                throw new Error(`The user ${id} does not exist`);
            }
    
            let SourceObj;
            let DestinationObj;
            try {
                SourceObj = JSON.parse(Source);
                DestinationObj = JSON.parse(Destination);
            } catch (err) {
                throw new Error("Invalid format for Source or Destination. Both should be valid JSON strings.");
            }
    
            // Overwriting original user with new user
            const updatedUser = {
                ID: id,
                Source: {
                    lat: SourceObj.lat,
                    lng: SourceObj.lng
                },
                Destination: {
                    lat: DestinationObj.lat,
                    lng: DestinationObj.lng
                },
                Token: token,
                Role: role,
                Seats: seats,
                Riders: [],
                Path: [],
                Driver: '',
                Threshold: threshold,
                Radius: radius,
                Assigned: false
            };
            console.log('User Updated:', updatedUser);
            // Insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedUser))));
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    // ReadUser returns the user stored in the world state with given id.
    async ReadUser(ctx, id) {
        try {
            const userJSON = await ctx.stub.getState(id); // get the user from chaincode state
            if (!userJSON || userJSON.length === 0) {
                throw new Error(`The user ${id} does not exist`);
            }
            return userJSON.toString();
        } catch (error) {
            throw new Error(`Failed to read user: ${error.message}`);
        }
    }

    async getPathAndDistance(source, destination) {
        try {
                const origins = `${source.lat},${source.lng}`;
                const destinations = `${destination.lat},${destination.lng}`;
        
                const apiKey = '<Paste your Google Maps API key here>'; // Replace with your Google Maps API key
                const directionsApiUrl = `https://maps.googleapis.com/maps/api/directions/json`;
        
                const directionsParams = {
                    origin: origins,
                    destination: destinations,
                    key: apiKey,
                    mode: "driving",
                    units: "metric",
                };
                const directionsResponse = await axios.get(directionsApiUrl, { params: directionsParams });
        
                if (directionsResponse.data.status !== "OK") {
                    throw new Error(`Error fetching data from Google Maps Directions API: ${directionsResponse.data.error_message}`);
                }
        
                const route = directionsResponse.data.routes[0];
                const encodedPath = route.overview_polyline.points;
                const decodedPath = polyline.decode(encodedPath);
                const path = decodedPath.map(point => ({ lat: point[0], lng: point[1] }));
                const distance = route.legs[0].distance.value;
        
                return { path, distance };
            } catch (error) {
                throw new Error(`Failed to get path and distance: ${error.message}`);
            }
    }

   haversineDistance(lat1, lon1, lat2, lon2) {
        const toRadians = (degrees) => degrees * (Math.PI / 180);
    
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
    
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
        return R * c; // Distance in kilometers
    }


    async is_on_driver_route(rider, path) {
        try {
            let l1 = Infinity; 
            let l2 = Infinity; 
            let riderSource = null;
            let riderDestination = null;
            for (const node of path) {
                let distance1  =  this.haversineDistance(node.lat, node.lng, rider.Source.lat, rider.Source.lng);
                if (distance1 < l1) {
                    l1 = distance1;
                    riderSource = { lat: node.lat, lng: node.lng };
                }
                
                let distance2  =  this.haversineDistance(node.lat, node.lng, rider.Destination.lat, rider.Destination.lng);
                if (distance2 < l2) {
                    l2 = distance2;
                    riderDestination = { lat: node.lat, lng: node.lng };
                }
            }
            return ((l1 <= rider.Radius && l2 <= rider.Radius) && (path.findIndex(node => node.lat === riderSource.lat && node.lng === riderSource.lng) < path.findIndex(node => node.lat === riderDestination.lat && node.lng === riderDestination.lng)));
        } catch (error) {
            throw new Error(`Failed to determine if rider is on driver route: ${error.message}`);
        }
    }
    

    async calculate_devited_path_length(driver, rider) {
        try {
            // Step 1: Driver's Source to rider's Source
            const { path: path1, distance: distance1 } = await this.getPathAndDistance(driver.Source, rider.Source);   
        
            // Step 2: Rider's Source to rider's Destination
            const { path: path2, distance: distance2 } = await this.getPathAndDistance(rider.Source, rider.Destination);
        
            // Step 3: Rider's Destination to driver's Destination
            const { path: path3, distance: distance3 } = await this.getPathAndDistance(rider.Destination, driver.Destination);
        
            // Calculate the total deviated path length
            const totalDevitedPathLength = distance1 + distance2 + distance3;
        
            return totalDevitedPathLength;
        } catch (error) {
            throw new Error(`Failed to calculate deviated path length: ${error.message}`);
        }
    }
     
    
    

    async MatrixCalculation(ctx) {
        try {
            console.log('###################Calculating matrix##########################');
            const allResults = [];
            const iterator = await ctx.stub.getStateByRange('', '');
            let result = await iterator.next();
        
            // Fetch all users from state
            while (!result.done) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                } catch (err) {
                    console.log(err);
                    record = strValue;
                }
                allResults.push(record);
                result = await iterator.next();
            }
        
            const users = allResults; // Ensure this is an array
        
            // Filter drivers and riders
            const drivers = users.filter(user => user.Role === 'driver' && user.Assigned === false);
            const riders = users.filter(user => user.Role === 'rider' && user.Assigned === false);
        
            let num_drivers = drivers.length;
            console.log('Number of Drivers:', num_drivers);
            let num_riders = riders.length;
            console.log('Number of Riders:', num_riders);
            let ER = Array.from({ length: num_drivers }, () => Array(num_riders).fill(0));
    
        
            for (const [i, driver] of drivers.entries()) {
                const { path: path1, distance: SP } = await this.getPathAndDistance(driver.Source, driver.Destination);
                console.log('Driver Path:', path1, 'Driver SP:', SP);
                const t = driver.Threshold;
                const radius = driver.Radius;
                
                for (let j = 0; j < riders.length; j++) {
                    const rider = riders[j];
                    console.log(' Inside - Rider:', rider);
                    if (t === 0) {
                        if (await this.is_on_driver_route(rider, path1)) {
                            ER[i][j] = 1;
                            console.log('Rider is on driver route');
                        }
                    } else {
                        const MP = SP * (1 + (t / 100));
                        const DP = await this.calculate_devited_path_length(driver, rider);
                        if (DP <= MP) {
                            ER[i][j] = 1;
                            console.log('Rider is within threshold');
                        }
                    }
                }
            }
            // Save the eligibility matrix to the ledger
            const ERKey = 'ERMatrix'; // Define a key for storing the matrix
            
            await ctx.stub.putState(ERKey, Buffer.from(JSON.stringify(ER)));
        } catch (error) {
            throw new Error(`Failed to calculate matrix: ${error.message}`);
        }
    }
    

    async getEligibilityMatrix(ctx) {
        try {
            const ERKey = 'ERMatrix';
            const ERStateBytes = await ctx.stub.getState(ERKey);
            if (!ERStateBytes || ERStateBytes.length === 0) {
                throw new Error('Eligibility Matrix not found');
            }
        
            const ERState = JSON.parse(ERStateBytes.toString());
            console.log('Retrieved Eligibility Matrix:', ERState);
            return ERState;
        } catch (error) {
            throw new Error(`Failed to get eligibility matrix: ${error.message}`);
        }
    }

    async select_driver(ctx, eligible_drivers, drivers) {
        try {
            console.log('#######################Eligible Drivers#########################');
            if (eligible_drivers.length === 1) {
                return eligible_drivers[0];
            } else {
                let max_seats = -1;
                let drivers_with_max_seats = [];
                console.log('Eligible Drivers:', eligible_drivers);
                eligible_drivers.forEach(driver_idx => {
                    if (drivers[driver_idx].Seats > max_seats) {
                        max_seats = drivers[driver_idx].Seats;
                        drivers_with_max_seats = [driver_idx];
                    } else if (drivers[driver_idx].Seats === max_seats) {
                        drivers_with_max_seats.push(driver_idx);
                    }
                });
        
                const blockHash = await this.getTransactionID(ctx); // Get the block hash
                const randomIndex = await this.hashToRandom(blockHash, 'driver') % drivers_with_max_seats.length; // Generate a random index
                console.log('Random Index:', randomIndex);
                const selected_driver = drivers_with_max_seats[randomIndex];
                return selected_driver;
            }
        } catch (error) {
            throw new Error(`Failed to select driver: ${error.message}`);
        }
    }

    async calculate_deviated_path_for_assignment(driver, rider) {
        try {
            const { path: path_to_rider_Source, distance: d1 } = await this.getPathAndDistance(
                { lat: driver.Source.lat, lng: driver.Source.lng },
                { lat: rider.Source.lat, lng: rider.Source.lng }
            );
            const { path: rider_path, distance: d2 } = await this.getPathAndDistance(
                { lat: rider.Source.lat, lng: rider.Source.lng },
                { lat: rider.Destination.lat, lng: rider.Destination.lng }
            );
            const { path: path_from_rider_Destination, distance: d3 } = await this.getPathAndDistance(
                { lat: rider.Destination.lat, lng: rider.Destination.lng },
                { lat: driver.Destination.lat, lng: driver.Destination.lng }
            );
            const full_path = path_to_rider_Source.concat(rider_path.slice(1), path_from_rider_Destination.slice(1));
            console.log('Full Path:', full_path);
            return full_path;
        } catch (error) {
            throw new Error(`Failed to calculate deviated path for assignment: ${error.message}`);
        }
    }

    async getTransactionID(ctx) {
        try {
            const txID = ctx.stub.getTxID(); // Get the transaction ID
            return txID;
        } catch (error) {
            throw new Error(`Failed to get transaction ID: ${error.message}`);
        }
    }
    
    async hashToRandom(blockHash, seed) {
        try {
            const hash = crypto.createHash('sha256').update(blockHash + seed).digest('hex');
            const randomValue = parseInt(hash.slice(0, 8), 16); // Convert the first 8 characters of the hash to an integer
            return randomValue;
        } catch (error) {
            throw new Error(`Failed to generate random value from hash: ${error.message}`);
        }
    }

    async assign_riders_to_drivers(ctx, ER, drivers, riders) {
        try {
            let DP_assigned = {};
            let num_drivers = drivers.length;
            let num_riders = riders.length;
        
            let offers = Array(num_riders).fill(0);
            console.log('Offers:', offers);
            ER.forEach(row => row.forEach((value, colIndex) => { offers[colIndex] += value; }));
        
            drivers.forEach(driver => {
                DP_assigned[driver.ID] = { driver_path: [], riders: []};
            });
            console.log(' Before DP Assigned:', DP_assigned);
            while (offers.reduce((a, b) => a + b, 0) > 0) {
                
                let non_zero_offers = offers.filter(offer => offer > 0);
    
                console.log('Offers:', offers);
    
                if (non_zero_offers.length === 0) {
                    break;
                }
    
                let min_offer = Math.min(...non_zero_offers);
                let min_offer_set = [];
                console.log('Min Offer:', min_offer);
                offers.forEach((element, i) => { if (element === min_offer) { min_offer_set.push(i); } });
        
                const blockHash = await this.getTransactionID(ctx); // Get the transaction ID
                const randomIndex = await this.hashToRandom(blockHash, 'rider') % min_offer_set.length; // Generate a random index
                console.log('Random Index:', randomIndex);
                const r_selected = min_offer_set[randomIndex];
    
                const eligible_drivers = [];
                
                ER.forEach((driver_row, i) => driver_row.forEach((value, j) => { 
                    if (j === r_selected && value === 1) { 
                        eligible_drivers.push(i); 
                    } 
                }));
                const d_assigned = await this.select_driver(ctx, eligible_drivers, drivers);
                let driver = drivers[d_assigned];
                let rider = riders[r_selected];
    
                console.log('Selected Driver:', driver, 'Selected Rider:', rider);
    
                if (drivers[d_assigned].Seats === 0) {
                    ER[d_assigned] = Array(riders.length).fill(0);
                    ER.forEach(row => row.forEach((value, colIndex) => { offers[colIndex] += value; }));
                    continue;
                }
    
                if (DP_assigned[driver.ID]['driver_path'].length === 0) {
                    let path = [];
                    if (driver.Threshold === 0) {
                        let {path: p, distance: d} = await this.getPathAndDistance(driver.Source, driver.Destination);
                        path = p;
                    } else {
                        path = await this.calculate_deviated_path_for_assignment(driver, rider);
                        for (let j = 0; j < riders.length; j++) {
                            if ((await this.is_on_driver_route(riders[j], path))) {
                                ER[d_assigned][j] = 1;
                                console.log('Rider is on driver route');
                            }
                        }
                    }
                    console.log('Driver Path:', path);
                    DP_assigned[driver.ID].driver_path = path;
                }
    
                DP_assigned[driver.ID]['riders'].push({
                    ID: rider.ID,
                    Source: rider.Source,
                    Destination: rider.Destination
                });
                
                for (let d = 0; d < drivers.length; d++) {
                    ER[d][r_selected] = 0;
                }
                drivers[d_assigned].Seats -= 1;
                if (drivers[d_assigned].Seats === 0) {
                    ER[d_assigned] = Array(riders.length).fill(0);
                }
                offers = Array(num_riders).fill(0);
                ER.forEach(row => row.forEach((value, colIndex) => { offers[colIndex] += value; }));
            }
            console.log('After DP Assigned:', DP_assigned);
            return DP_assigned;
        } catch (error) {
            throw new Error(`Failed to assign riders to drivers: ${error.message}`);
        }
    }


    // DoAssignment assigns a rider to a driver
    async DoAssignment(ctx) {
        try {
            const allResults = [];
            const iterator = await ctx.stub.getStateByRange('', '');
            let result = await iterator.next();
    
            while (!result.done) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                } catch (err) {
                    console.log(err);
                    record = strValue;
                }
                allResults.push(record);
                result = await iterator.next();
            }
    
            const users = allResults; // Ensure this is an array
    
            const drivers = users.filter(user => user.Role === 'driver' && user.Assigned === false && user.Seats > 0);
            const riders = users.filter(user => user.Role === 'rider' && user.Assigned === false && user.Token > 0);
    
            if (drivers.length > 0 || riders.length > 0) {
                console.log('Drivers:', drivers, 'Riders:', riders);
                const ERKey = 'ERMatrix';
                const ERStateBytes = await ctx.stub.getState(ERKey);
                if (!ERStateBytes || ERStateBytes.length === 0) {
                    throw new Error('Eligibility Matrix not found');
                }
        
                const ER = JSON.parse(ERStateBytes.toString());
                console.log('Eligibility Matrix:', ER);
                let DPassigned = await this.assign_riders_to_drivers(ctx, ER, drivers, riders);
        
                users.forEach(user => {
                    if (user.Role === 'driver') {
                        let riderid;
                        DPassigned[user.ID].riders.forEach(rider => {   
                            riderid = rider.ID;
                            let riderSource = null;
                            let riderDestination = null;
                            let l1 = Infinity; // distance from path node to rider source
                            let l2 = Infinity; // distance from path node to rider destination
                        
                            for (const node of DPassigned[user.ID].driver_path) {
                                let distance1 =  this.haversineDistance(node.lat, node.lng, rider.Source.lat, rider.Source.lng);
                                if (distance1 < l1) {
                                    l1 = distance1;
                                    riderSource = { lat: node.lat, lng: node.lng };
                                }
                                let distance2 = this.haversineDistance(node.lat, node.lng, rider.Destination.lat, rider.Destination.lng);
                                if (distance2 < l2) {
                                    l2 = distance2;
                                    riderDestination = { lat: node.lat, lng: node.lng };
                                }
                            }
        
                            user.Token += 2;
                            user.Riders.push({ [riderid]: { Source: { lat: riderSource.lat, lng: riderSource.lng }, Destination: { lat: riderDestination.lat, lng: riderDestination.lng } } });
                            user.Path = DPassigned[user.ID].driver_path;
                        });
        
                        user.Assigned = true;
                        
                    } else if (user.Role === 'rider') {
                        let driverid = null;
                        let riderSource = null;
                        let riderDestination = null;
        
                        Object.entries(DPassigned).forEach(([key, element]) => {
                            if (element.riders.some(rider => rider.ID === user.ID)) {
                                driverid = key;
                                let l1 = Infinity; // distance from path node to rider source
                                let l2 = Infinity; // distance from path node to rider destination
                                for (const node of element.driver_path) {
                                    let distance1 = this.haversineDistance(node.lat, node.lng, user.Source.lat, user.Source.lng);
                                    if (distance1 < l1) {
                                        l1 = distance1;
                                        riderSource = { lat: node.lat, lng: node.lng };
                                    }
                                    let distance2 = this.haversineDistance(node.lat, node.lng, user.Destination.lat, user.Destination.lng);
                                    if (distance2 < l2) {
                                        l2 = distance2;
                                        riderDestination = { lat: node.lat, lng: node.lng };
                                    }
                                }
                            }
                        });
        
                        if (driverid === null || !DPassigned[driverid]) {
                            return;
                        }
        
                        user.Token -= 2;
                        user.Driver = { ID: driverid, Source: { lat: riderSource.lat, lng: riderSource.lng }, Destination: { lat: riderDestination.lat, lng: riderDestination.lng } };
                        user.Path = DPassigned[driverid].driver_path.slice(
                            DPassigned[driverid].driver_path.findIndex(node => node.lat === riderSource.lat && node.lng === riderSource.lng),
                            DPassigned[driverid].driver_path.findIndex(node => node.lat === riderDestination.lat && node.lng === riderDestination.lng) + 1
                        );
                        user.Assigned = true;
                    }
                });
        
                for (const user of users) {
                    // example of how to write to world state deterministically
                    // use convention of alphabetic order
                    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
                    // when retrieving data, in any lang, the order of data will be the same and consequently also the corresponding hash
                    if (user.Role === 'driver' || user.Role === 'rider') {
                        await ctx.stub.putState(user.ID, Buffer.from(stringify(sortKeysRecursive(user))));
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to perform assignment: ${error.message}`);
        }
    }

    // Helper function to check if a string is a valid JSON
    isValidJSON(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    // GetNumberOfUsers returns the total number of users in the world state.
    async GetNumberOfUsers(ctx) {
        try {
            const allResults = [];
            const iterator = await ctx.stub.getStateByRange('', '');
            let result = await iterator.next();
            
            while (!result.done) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                } catch (err) {
                    console.log(err);
                    record = strValue;
                }
                allResults.push(record);
                result = await iterator.next();
            }
            
            // Filter users where Assigned is false
            const unassignedUsers = allResults.filter(user => user.Assigned === false);
            
            return unassignedUsers.length;
        } catch (error) {
            throw new Error(`Failed to get number of users: ${error.message}`);
        }
    }


    // UserExists returns true when user with given ID exists in world state.
    async UserExists(ctx, id) {
        const userJSON = await ctx.stub.getState(id);
        return userJSON && userJSON.length > 0;
    }
    
}

module.exports = rideSharing;
