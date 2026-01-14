
import bcrypt from 'bcryptjs';

async function testHash() {
    console.log("Testing bcryptjs...");
    const password = "password123";
    console.log(`Original Password: ${password}`);

    const hash = await bcrypt.hash(password, 10);
    console.log(`Generated Hash: ${hash}`);

    const isValid = await bcrypt.compare(password, hash);
    console.log(`Verification Result (should be true): ${isValid}`);

    const isInvalid = await bcrypt.compare("wrongpassword", hash);
    console.log(`Invalid Password Check (should be false): ${isInvalid}`);

    // Simulate what happens in auth.ts
    const userEmail = "User@Example.com";
    const lookupEmail = "user@example.com";
    console.log(`\nSimulating Email Lookup:`);
    console.log(`Input: ${userEmail}, Lookup: ${lookupEmail}`);
    console.log(`Match? ${userEmail.toLowerCase() === lookupEmail.toLowerCase()}`);
}

testHash().catch(console.error);
