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
import { getDefaultServerUrl, normalizeServerUrl } from '../config/api';

export default function RegisterScreen({ route, navigation }) {
  const { register } = useContext(AuthContext);
  const routeServerUrl = route.params?.serverUrl || '';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(routeServerUrl || getDefaultServerUrl());
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    const cleanServerUrl = normalizeServerUrl(serverUrl);

    if (!username.trim() || !email.trim() || !password || !confirmPassword || !cleanServerUrl) {
      Alert.alert('Campos incompletos', 'Por favor completa todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Contraseña no coincide', 'Las contraseñas ingresadas no son iguales.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password, cleanServerUrl);
      Alert.alert(
        'Registro Exitoso',
        'Operador registrado con éxito. Ya podés iniciar sesión.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      Alert.alert('Error de Registro', err.message);
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

          <Text style={styles.inputLabel}>Nombre de Operador (Username)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Ej: JBE10"
              placeholderTextColor={Theme.colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputLabel}>Correo Electrónico (Email)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="email" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Ej: operador@uade.edu.ar"
              placeholderTextColor={Theme.colors.textDim}
              keyboardType="email-address"
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

          <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock-check" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={Theme.colors.textDim}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Register Button */}
          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.accent} style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>CREAR OPERADOR</Text>
            </TouchableOpacity>
          )}

          {/* Login Link */}
          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tenés cuenta? <Text style={styles.loginLinkBold}>Inicia sesión acá</Text>
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
    padding: 24,
    justifyContent: 'center',
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
  registerButton: {
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
  registerButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
  },
  loginLinkBold: {
    color: Theme.colors.accent,
    fontWeight: 'bold',
  },
});
