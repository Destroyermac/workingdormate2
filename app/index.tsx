
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the tabs layout (job board)
  return <Redirect href="/(tabs)" />;
}
