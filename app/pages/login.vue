<script setup lang="ts">
const icons = useAppConfig()

definePageMeta({
  layout: false
})

const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!password.value.trim()) {
    errorMessage.value = 'Por favor ingresa la contraseña'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value }
    })

    // Actualizar estado reactivo de la sesión en el cliente
    await refreshSession()

    toast.add({
      title: '¡Bienvenido!',
      description: 'Acceso autorizado al panel financiero.',
      color: 'success',
      icon: icons.appIcons.shieldCheck
    })

    await navigateTo('/')
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Contraseña incorrecta. Inténtalo de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-default px-4 py-10">
    <div class="w-full max-w-sm space-y-5">
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2 text-sm font-semibold text-highlighted"><UIcon
          :name="icons.appIcons.creditCard"
          class="size-5 text-primary"
        />Control Tarjetas</span>
        <UColorModeButton />
      </div>
      <UCard :ui="{ body: 'p-5 sm:p-6' }">
        <h1 class="text-xl font-semibold tracking-tight text-highlighted">
          Finanzas personales
        </h1>
        <p class="mt-1 text-sm text-muted">
          Accede a tu presupuesto, nómina y tarjetas.
        </p>
        <form
          class="mt-6 space-y-4"
          @submit.prevent="handleLogin"
        >
          <UFormField
            label="Contraseña de acceso"
            name="password"
            :error="errorMessage || undefined"
            required
          >
            <UInput
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :icon="icons.appIcons.lock"
              placeholder="Ingresa tu contraseña"
              class="w-full"
              autocomplete="current-password"
              :disabled="loading"
              required
              autofocus
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? icons.ui.icons.eyeOff : icons.ui.icons.eye"
                  color="neutral"
                  variant="link"
                  size="sm"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>
          <UButton
            type="submit"
            label="Entrar"
            :icon="icons.ui.icons.arrowRight"
            :loading="loading"
            block
          />
        </form>
        <p class="mt-5 flex items-center gap-1.5 border-t border-default pt-4 text-xs text-muted">
          <UIcon
            :name="icons.appIcons.shieldCheck"
            class="size-4"
          />Sesión segura de 60 días
        </p>
      </UCard>
    </div>
  </main>
</template>
