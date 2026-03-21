import { redirect } from 'next/navigation';

export default function WorkspacesIndex() {
  // Redirect to a default workspace
  redirect('/workspaces/clay');
}
