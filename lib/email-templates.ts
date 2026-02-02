export const EMAIL_FOOTER = `
<br/>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #888; font-family: sans-serif;">
    RecruitAI<br>
    <a href="https://www.recruitaitech.in" style="color: #888; text-decoration: none;">www.recruitaitech.in</a><br>
    <a href="mailto:support@recruitaitech.in" style="color: #888; text-decoration: none;">support@recruitaitech.in</a>
</p>
`;

const BASE_STYLES = `font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;`;

const wrapContent = (content: string) => `
<div style="${BASE_STYLES}">
    ${content}
    ${EMAIL_FOOTER}
</div>
`;

export const EmailTemplates = {
    // 1️⃣ EMAIL VERIFICATION (OTP)
    emailVerification: (firstName: string, otp: string) => ({
        subject: `Verify Your Email Address – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>To continue with your application, please verify your email address.</p>
            <p><strong>Your Verification Code:</strong></p>
            <h2 style="color: #2563EB; font-size: 24px; letter-spacing: 2px;">${otp}</h2>
            <p>This code is valid for 10 minutes.</p>
            <p style="font-size: 12px; color: #666;"><strong>Security Note:</strong> Do not share this code with anyone. This step does not submit your application.</p>
        `)
    }),

    // 2️⃣ PHONE NUMBER VERIFICATION (OTP VIA EMAIL)
    phoneVerification: (firstName: string, otp: string) => ({
        subject: `Phone Number Verification Code – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>Due to current system configuration, your phone verification OTP is delivered to your registered email address.</p>
            <p><strong>Your Verification Code:</strong></p>
            <h2 style="color: #2563EB; font-size: 24px; letter-spacing: 2px;">${otp}</h2>
            <p>This code is valid for 10 minutes.</p>
            <p>Upon confirming this code, your phone number will be marked as verified in our system.</p>
        `)
    }),

    // 3️⃣ APPLICATION SUBMITTED CONFIRMATION
    applicationSubmitted: (firstName: string, role: string) => ({
        subject: `Application Submitted Successfully – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>Your application for the <strong>${role}</strong> position has been submitted successfully.</p>
            <p>We have received your resume and profile details.</p>
            <p><strong>Next Steps:</strong></p>
            <ul style="padding-left: 20px;">
                <li>Our ATS system will screen your profile.</li>
                <li>If your profile matches our requirements, you will receive further communication regarding the assessment round.</li>
            </ul>
            <p>No further action is required from you at this moment.</p>
        `)
    }),

    // 4️⃣ ATS SHORTLISTED
    applicationShortlisted: (firstName: string, role: string) => ({
        subject: `Application Shortlisted – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>We are pleased to inform you that your application for the <strong>${role}</strong> position has been shortlisted after our initial screening.</p>
            <p>We are excited to move forward with your candidature.</p>
            <p>Details regarding the next stage of the hiring process will be shared with you shortly.</p>
        `)
    }),

    // 5️⃣ ATS NOT SHORTLISTED
    applicationRejected: (firstName: string, role: string) => ({
        subject: `Application Update – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>Thank you for applying for the <strong>${role}</strong> position at RecruitAI.</p>
            <p>After careful review, we regret to inform you that we will not be moving forward with your application at this stage.</p>
            <p>We appreciate your time and interest. We encourage you to apply for future openings that match your skills.</p>
        `)
    }),

    // 6️⃣ EXAM ASSIGNED
    examAssigned: (firstName: string, examTitle: string, scheduledTime: string | null, duration: number, link: string) => ({
        subject: `Online Assessment Assigned – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>You have been assigned an online assessment: <strong>${examTitle}</strong>.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${scheduledTime ? new Date(scheduledTime).toLocaleString() : 'Flexible'}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> ${duration} Minutes</p>
            </div>
            <p><strong>Instructions:</strong></p>
            <ul style="padding-left: 20px;">
                <li>You can enter the assessment lobby 15 minutes before the scheduled start time.</li>
                <li>Ensure you have a stable internet connection.</li>
                <li>Do not refresh the page or switch tabs unnecessarily during the exam.</li>
            </ul>
             <p>Please login to your dashboard to access the assessment.</p>
            <br>
             <a href="${link}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dashboard</a>
        `)
    }),

    // 7️⃣ EXAM PASSED
    examPassed: (firstName: string, examTitle: string) => ({
        subject: `Assessment Cleared – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>Congratulations! You have successfully cleared the <strong>${examTitle}</strong> assessment.</p>
            <p>We are impressed with your performance in this round.</p>
            <p><strong>Next Step:</strong> Our team will review your results and schedule an interview shortly.</p>
        `)
    }),

    // 8️⃣ EXAM NOT CLEARED
    examFailed: (firstName: string, examTitle: string) => ({
        subject: `Assessment Result – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>Thank you for taking the <strong>${examTitle}</strong> assessment.</p>
            <p>Based on the results, you did not clear this round of the selection process.</p>
            <p>We appreciate your effort and wish you the best in your career journey.</p>
        `)
    }),

    // 9️⃣ INTERVIEW SCHEDULED
    interviewScheduled: (firstName: string, date: string, mode: string, duration: number) => ({
        subject: `Interview Scheduled – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>Your interview has been scheduled.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${new Date(date).toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Mode:</strong> ${mode}</p>
                 <p style="margin: 5px 0;"><strong>Duration:</strong> ${duration} Minutes</p>
            </div>
            <p><strong>Preparation:</strong></p>
            <ul style="padding-left: 20px;">
                <li>Ensure your camera and microphone are working properly.</li>
                <li>Join from a quiet environment.</li>
                <li>Please be ready 5 minutes before the scheduled time.</li>
            </ul>
        `)
    }),

    // 🔟 TECHNICAL / SUPPORT EMAIL
    supportRequestReceived: (firstName: string) => ({
        subject: `Support Request Received – RecruitAI`,
        html: wrapContent(`
            <p>Hello ${firstName},</p>
            <p>We have received your support request.</p>
            <p>Our support team is reviewing your query and will get back to you as soon as possible.</p>
            <p>If you have additional details to add, please reply to this email.</p>
        `)
    })
};
