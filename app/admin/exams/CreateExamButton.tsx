"use client";

import { useState } from "react";
import CreateExamModal from "./CreateExamModal";

export default function CreateExamButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => {
                    console.log("Create Exam button clicked");
                    setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                Create New Exam
            </button>
            <CreateExamModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
