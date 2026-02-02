
import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env', override: true });

// 26 Districts of Andhra Pradesh
const DISTRICTS = [
    "Srikakulam", "Vizianagaram", "Parvathipuram Manyam", "Alluri Sitharama Raju",
    "Visakhapatnam", "Anakapalli", "Kakinada", "Dr. B.R. Ambedkar Konaseema",
    "East Godavari", "West Godavari", "Eluru", "Krishna", "NTR", "Guntur",
    "Bapatla", "Palnadu", "Prakasam", "Sri Potti Sriramulu Nellore",
    "Kurnool", "Nandyal", "Anantapur", "Sri Sathya Sai", "YSR Kadapa",
    "Annamayya", "Chittoor", "Tirupati"
];

// Sample "Authoritative" Data - In reality this would be 500+ lines
// I will generate a robust representative set here
const COLLEGES_DB = [
    // --- UNIVS ---
    { name: "Andhra University", city: "Visakhapatnam", district: "Visakhapatnam", type: "University", university: "Andhra University" },
    { name: "Jawaharlal Nehru Technological University Kakinada (JNTUK)", city: "Kakinada", district: "Kakinada", type: "University", university: "JNTUK" },
    { name: "Jawaharlal Nehru Technological University Anantapur (JNTUA)", city: "Anantapur", district: "Anantapur", type: "University", university: "JNTUA" },
    { name: "Sri Venkateswara University", city: "Tirupati", district: "Tirupati", type: "University", university: "SVU" },
    { name: "Acharya Nagarjuna University", city: "Guntur", district: "Guntur", type: "University", university: "ANU" },
    { name: "Sri Krishnadevaraya University", city: "Anantapur", district: "Anantapur", type: "University", university: "SKU" },
    { name: "Yogi Vemana University", city: "Kadapa", district: "YSR Kadapa", type: "University", university: "YVU" },
    { name: "Adikavi Nannaya University", city: "Rajahmundry", district: "East Godavari", type: "University", university: "AKNU" },
    { name: "Krishna University", city: "Machilipatnam", district: "Krishna", type: "University", university: "KRU" },
    { name: "Rayalaseema University", city: "Kurnool", district: "Kurnool", type: "University", university: "RU" },
    { name: "Vikrama Simhapuri University", city: "Nellore", district: "Sri Potti Sriramulu Nellore", type: "University", university: "VSU" },
    { name: "Dr. B.R. Ambedkar University", city: "Srikakulam", district: "Srikakulam", type: "University", university: "BRAU" },
    { name: "Dravidian University", city: "Kuppam", district: "Chittoor", type: "University", university: "DU" },
    { name: "Sri Padmavati Mahila Visvavidyalayam", city: "Tirupati", district: "Tirupati", type: "University", university: "SPMVV" },

    // --- ENGINEERING (VISAKHAPATNAM) ---
    { name: "Gayatri Vidya Parishad College of Engineering (Autonomous)", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "JNTUK" },
    { name: "Anil Neerukonda Institute of Technology and Sciences (ANITS)", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "Andhra University" },
    { name: "Raghu Engineering College", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "JNTUK" },
    { name: "Vignan's Institute of Information Technology", city: "Visakhapatnam", district: "Visakhapatnam", type: "Engineering", university: "JNTUK" },
    { name: "Lendi Institute of Engineering and Technology", city: "Vizianagaram", district: "Vizianagaram", type: "Engineering", university: "JNTUK" },
    { name: "Maharaj Vijayaram Gajapathi Raj (MVGR) College of Engineering", city: "Vizianagaram", district: "Vizianagaram", type: "Engineering", university: "JNTUK" },

    // --- ENGINEERING (KAKINADA / GODAVARI) ---
    { name: "Aditya Engineering College", city: "Surampalem", district: "Kakinada", type: "Engineering", university: "JNTUK" },
    { name: "Pragati Engineering College", city: "Surampalem", district: "Kakinada", type: "Engineering", university: "JNTUK" },
    { name: "Godavari Institute of Engineering and Technology (GIET)", city: "Rajahmundry", district: "East Godavari", type: "Engineering", university: "JNTUK" },
    { name: "Shri Vishnu Engineering College for Women", city: "Bhimavaram", district: "West Godavari", type: "Engineering", university: "JNTUK" },
    { name: "Vishnu Institute of Technology", city: "Bhimavaram", district: "West Godavari", type: "Engineering", university: "JNTUK" },
    { name: "SRKR Engineering College", city: "Bhimavaram", district: "West Godavari", type: "Engineering", university: "JNTUK" },

    // --- ENGINEERING (KRISHNA / NTR / GUNTUR) ---
    { name: "Velagapudi Ramakrishna Siddhartha Engineering College", city: "Vijayawada", district: "NTR", type: "Engineering", university: "JNTUK" },
    { name: "Prasad V. Potluri Siddhartha Institute of Technology", city: "Vijayawada", district: "NTR", type: "Engineering", university: "JNTUK" },
    { name: "Lakireddy Bali Reddy College of Engineering", city: "Mylavaram", district: "NTR", type: "Engineering", university: "JNTUK" },
    { name: "RVR & JC College of Engineering", city: "Guntur", district: "Guntur", type: "Engineering", university: "ANU" },
    { name: "Vasireddy Venkatadri Institute of Technology (VVIT)", city: "Guntur", district: "Guntur", type: "Engineering", university: "JNTUK" },
    { name: "Vignan's University (Deemed)", city: "Guntur", district: "Guntur", type: "University", university: "Deemed" },
    { name: "K L University (Deemed)", city: "Vijayawada", district: "Guntur", type: "University", university: "Deemed" },
    { name: "Narasaraopeta Engineering College", city: "Narasaraopet", district: "Palnadu", type: "Engineering", university: "JNTUK" },

    // --- ENGINEERING (RAYALASEEMA) ---
    { name: "Sree Vidyanikethan Engineering College", city: "Tirupati", district: "Tirupati", type: "Engineering", university: "JNTUA" },
    { name: "Madanapalle Institute of Technology and Science", city: "Madanapalle", district: "Annamayya", type: "Engineering", university: "JNTUA" },
    { name: "G Pulla Reddy Engineering College", city: "Kurnool", district: "Kurnool", type: "Engineering", university: "JNTUA" },
    { name: "Rajeev Gandhi Memorial College of Engineering and Technology", city: "Nandyal", district: "Nandyal", type: "Engineering", university: "JNTUA" },
    { name: "Annamacharya Institute of Technology and Sciences", city: "Rajampet", district: "Annamayya", type: "Engineering", university: "JNTUA" },
    { name: "N.B.K.R. Institute of Science and Technology", city: "Vidyanagar", district: "Sri Potti Sriramulu Nellore", type: "Engineering", university: "JNTUA" },

    // --- DEGREE / ARTS / OTHERS ---
    { name: "Andhra Loyola College", city: "Vijayawada", district: "NTR", type: "Degree", university: "Krishna University" },
    { name: "P.B. Siddhartha College of Arts & Science", city: "Vijayawada", district: "NTR", type: "Degree", university: "Krishna University" },
    { name: "Mrs. A.V.N. College", city: "Visakhapatnam", district: "Visakhapatnam", type: "Degree", university: "Andhra University" },
    { name: "Dr. V.S. Krishna Govt. Degree College", city: "Visakhapatnam", district: "Visakhapatnam", type: "Degree", university: "Andhra University" },
    { name: "Government College (Autonomous)", city: "Rajahmundry", district: "East Godavari", type: "Degree", university: "AKNU" },
    { name: "P.R. Government College", city: "Kakinada", district: "Kakinada", type: "Degree", university: "AKNU" },
    { name: "Silver Jubilee Government College", city: "Kurnool", district: "Kurnool", type: "Degree", university: "RU" },
    { name: "D.K. Government College for Women", city: "Nellore", district: "Sri Potti Sriramulu Nellore", type: "Degree", university: "VSU" },
];

async function seedColleges() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
        console.error("Missing DATABASE_URL");
        process.exit(1);
    }

    const sql = postgres(dbUrl, { ssl: 'require', max: 10 });
    console.log(`Using Database: ${dbUrl.split('@')[1]}`); // Log masked URL
    console.log(`Seeding ${COLLEGES_DB.length} core AP colleges...`);

    let added = 0;
    let skipped = 0;

    try {
        for (const college of COLLEGES_DB) {
            // Deduplication: Check Name + District
            const existing = await sql`
                SELECT id FROM colleges 
                WHERE name = ${college.name} AND district = ${college.district}
                LIMIT 1
            `;

            if (existing.length === 0) {
                await sql`
                    INSERT INTO colleges (name, state, district, city, university, type, status, approved_by)
                    VALUES (${college.name}, 'Andhra Pradesh', ${college.district}, ${college.city}, ${college.university}, ${college.type}, 'active', 'UGC/AICTE')
                `;
                added++;
            } else {
                skipped++;
            }
        }
        console.log(`Seeding complete. Added: ${added}, Skipped (Duplicate): ${skipped}`);

        // Count total
        const count = await sql`SELECT count(*) FROM colleges`;
        console.log(`Total Colleges in DB: ${count[0].count}`);

    } catch (e) {
        console.error("Seeding error:", e);
    } finally {
        await sql.end();
    }
}

seedColleges();
