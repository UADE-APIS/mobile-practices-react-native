import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { Theme } from '../config/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  
  const [identifier, setIdentifier] = useState('JBE10');
  const [password, setPassword] = useState('password123'); // Default for development
  const [serverUrl, setServerUrl] = useState(
    Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000'
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password || !serverUrl) {
      Alert.alert('Campos incompletos', 'Por favor completa todos los campos.');
      return;
    }
    
    setLoading(false);
    setLoading(true);
    try {
      await login(identifier, password, serverUrl);
    } catch (err) {
      Alert.alert('Error de Autenticación', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Futuristic Logo / Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoRing}>
            <MaterialCommunityIcons name="robot" size={64} color={Theme.colors.accent} />
          </View>
          <Text style={styles.logoText}>UNITREE CONTROLLER</Text>
          <Text style={styles.logoSubtitle}>Terminal de Acceso Móvil</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Dirección de la API del Robot</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="server" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://localhost:8000"
              placeholderTextColor={Theme.colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputLabel}>Identificador (Usuario o Email)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Nombre de usuario"
              placeholderTextColor={Theme.colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputLabel}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Theme.colors.textDim}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialCommunityIcons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color={Theme.colors.textMuted} 
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.accent} style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>INICIAR SESIÓN</Text>
            </TouchableOpacity>
          )}

          {/* Register Link */}
          <TouchableOpacity 
            style={styles.registerLink} 
            onPress={() => navigation.navigate('Register', { serverUrl })}
          >
            <Text style={styles.registerLinkText}>
              ¿No tenés una cuenta? <Text style={styles.registerLinkBold}>Registrate aquí</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderWidth: 1.5,
    borderColor: Theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.text,
    letterSpacing: 1.5,
  },
  logoSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formContainer: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  loader: {
    marginTop: 16,
  },
  loginButton: {
    height: 48,
    backgroundColor: Theme.colors.accent,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  registerLinkText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
  },
  registerLinkBold: {
    color: Theme.colors.accent,
    fontWeight: 'bold',
  },
});
