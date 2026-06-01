# Exercise Seeding Instructions

To populate your database with the massive exercise library:

1.  Navigate to the `scripts` folder: `cd project-source/scripts`
2.  Install `tsx` (if not already installed) to run TypeScript files: `npm install -g tsx`
3.  Run the seeding script: `tsx seed-exercises.ts`

Note: Ensure your environment variables (`supabaseUrl` and `supabaseAnonKey`) are correctly configured in your local environment so the script can connect to your Supabase project.
