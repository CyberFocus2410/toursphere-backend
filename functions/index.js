const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
    
// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// --- API Endpoint 1: User Registration ---
exports.registerUser = functions.https.onCall(async (data, context) => {
    const { email, password } = data;
    try {
        const userRecord = await auth.createUser({ email, password });
        await db.collection('users').doc(userRecord.uid).set({
            email: userRecord.email,
            role: 'user', 
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: 'User registered successfully!' };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- API Endpoint 2: Admin Login ---
exports.adminLogin = functions.https.onCall(async (data, context) => {
    const { email, password } = data;
    try {
        const userRecord = await auth.getUserByEmail(email);
        if (userRecord.customClaims && userRecord.customClaims.admin === true) {
            return { success: true, message: 'Admin login successful!' };
        } else {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid admin credentials');
        }
    } catch (error) {
        throw new functions.https.HttpsError('unauthenticated', 'Invalid admin credentials');
    }
});

// --- API Endpoint 3: Create a new trip ---
exports.createTrip = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = context.auth.uid;
    const { origin, destination, modeOfTransport } = data;
    try {
        const tripRef = await db.collection('trips').add({
            userId, origin, destination, modeOfTransport,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, tripId: tripRef.id, message: 'Trip created successfully' };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- API Endpoint 4: Update a trip with data ---
exports.updateTripData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { tripId, fare, distance, duration } = data;
    try {
        await db.collection('trips').doc(tripId).update({ fare, distance, duration });
        return { success: true, message: 'Trip data updated successfully' };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- API Endpoint 5: Search for cabs (Placeholder) ---
exports.searchCabs = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    try {
        // Placeholder for third-party API calls
        const mockResults = [
            { provider: 'Ola', fare: 250, time: '15 min', url: 'https://ola.com/book' },
            { provider: 'Uber', fare: 220, time: '12 min', url: 'https://uber.com/book' },
            { provider: 'Rapido', fare: 180, time: '20 min', url: 'https://rapido.com/book' }
        ];
        return { success: true, results: mockResults };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to fetch cab options');
    }
});

// --- API Endpoint 6: Admin Data Reports ---
exports.getAdminReports = functions.https.onCall(async (data, context) => {
    if (!(context.auth && context.auth.token.admin)) {
        throw new functions.https.HttpsError('permission-denied', 'You must have admin privileges.');
    }
    try {
        const tripsSnapshot = await db.collection('trips').get();
        const totalTrips = tripsSnapshot.size;
        const tripsByMode = {};
        for (const doc of tripsSnapshot.docs) {
            const mode = doc.data().modeOfTransport;
            tripsByMode[mode] = (tripsByMode[mode] || 0) + 1;
        }
        return { success: true, totalTrips, tripsByMode, message: 'Additional reports can be added here.' };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});




// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
