import React from 'react';
import { Check } from 'lucide-react';
import Layout from '../components/Layout';

export default function About() {
  return (
    <Layout>
      <header className="mb-10 text-center md:text-left mt-4 md:mt-0">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">About EduCrate</h2>
        <p className="text-textMuted max-w-2xl mx-auto md:mx-0">
          A Centralized Platform for Note Sharing for KTU B.Tech Students
        </p>
      </header>

      <div className="max-w-4xl space-y-8 text-gray-300 leading-relaxed mx-auto md:mx-0">
        <div className="bg-surface border border-white/5 p-6 md:p-8 rounded-xl">
          <p className="mb-6">
            EduCrate is a centralized note-sharing platform created exclusively for KTU B.Tech students following the 2024 Scheme. The platform is specially designed to provide students with easy access to academic resources including notes, previous year question papers (PYQs), assignments, and study materials based on the latest KTU syllabus.
          </p>
          
          <p className="mb-6">
            EduCrate focuses entirely on the needs of 2024 Scheme students by organizing resources semester-wise and subject-wise, making it easier for students to find the right materials for their courses. Instead of searching through multiple platforms and student groups, users can access everything in one organized and student-friendly environment.
          </p>

          <p>
            The platform encourages collaborative learning by allowing students to share useful notes and study resources with others. EduCrate aims to simplify exam preparation and improve academic productivity by building a dedicated learning space for KTU students.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-white mb-4 text-center md:text-left">Key Features</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Exclusive platform for KTU B.Tech 2024 Scheme students",
              "Access to notes, PYQs, assignments, and study materials",
              "Semester-wise and subject-wise resource organization",
              "Easy search and quick access to academic content",
              "Student contribution and collaborative learning",
              "Clean, secure, and user-friendly interface"
            ].map((feature, index) => (
              <li key={index} className="flex items-start gap-3 bg-white/5 p-4 rounded-lg border border-white/5">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={14} />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-primary/10 border border-primary/20 p-6 rounded-xl text-center mt-12">
          <p className="text-primary font-medium text-lg">
            EduCrate aims to become a reliable academic companion for KTU students by making quality educational resources accessible in one centralized platform.
          </p>
        </div>
      </div>
    </Layout>
  );
}
