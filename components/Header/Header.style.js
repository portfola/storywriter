
import { StyleSheet } from "react-native";

const s = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  navLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    color: '#fff',
    fontSize: 16,
  },
});

export { s }