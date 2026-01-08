import { auth } from "@clerk/nextjs/server";

export default async function DebugUserPage() {
  const { userId } = await auth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">User Debug Info</h1>
      {userId ? (
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded">
          <p className="font-mono text-sm">
            Your Clerk User ID: <strong>{userId}</strong>
          </p>
          <p className="mt-4 text-sm">
            Add this ID to the <code>ADMIN_USER_IDS</code> array in{" "}
            <code>src/lib/admin.ts</code>
          </p>
        </div>
      ) : (
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded">
          <p>You are not signed in. Please sign in first.</p>
        </div>
      )}
    </div>
  );
}
