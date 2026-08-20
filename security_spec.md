# Security Specification: EduManage Roles and Invariants

This document outlines the security invariants, access models, and mitigation strategies for the EduManage Firestore Database.

## 1. Data Invariants

1. **School-Isolation Invariant**: A user or data object (homework, marks, fees, issues, configs) MUST belong to a valid school. No student, teacher, clerk, or administrator can read, write, or query data outside their own school ID (`schoolId`), unless they hold the role of `MASTER_ADMIN`.
2. **Role Integrity**: A user cannot modify their own role. Only a `MASTER_ADMIN` can register new schools and write initial Admin users. Only an Admin user (`ADMIN`) can register new Clerks, Teachers, or Students inside their specific school.
3. **Write/Update Restrictions**:
   - `STUDENT` users can only read homework, marks, fee records, and list issues. They can create issues but cannot modify other records.
   - `TEACHER` users can manage Homework and Exam Marks for students of their school, but they cannot delete or insert fee records or manage other users.
   - `CLERK` users can view grades and issue receipts (fee records) but cannot edit homework states or exam marks.
   - Timestamp updates must match `request.time`.

## 2. The Dirty Dozen Payloads (Identified Vulnerabilities Check)

1. **Tenant Cross-Talk**: A user from `schoolA` attempting to read homework of `schoolB`.
2. **Privilege Escalation**: A Clerk trying to change their role to `MASTER_ADMIN` or `ADMIN`.
3. **Unauthorized Financials**: A student attempting to create a mock `FeeRecord` reducing their overall pending balance.
4. **ID Poisoning**: Attempting to create a document with a 1.5MB ID string or symbols to blow up costs/indexing.
5. **Session Intercept**: A teacher trying to alter the system-wide active Academic Session configuration of a different school.
6. **Student Spoof**: A student submitting grades or updating marks of themselves or another classmate.

## 3. Firestore Rules Generation Spec
The rule matches will explicitly check matching attributes against `request.auth` or internal user roles for security.
