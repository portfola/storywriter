import { Stack } from 'expo-router';

export default function BookshelfLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="index"
                options={{
                    title: 'My Bookshelf',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
