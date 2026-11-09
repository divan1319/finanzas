<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const icons = useAppConfig()

const route = useRoute()
const { openNewExpenseModal, openIncomeModal, triggerRefresh } = useFinanzas()
const toast = useToast()

const mobileMenuOpen = ref(false)
const seeding = ref(false)
const confirmResetModalOpen = ref(false)
const resetting = ref(false)

// Cerrar menú móvil al navegar
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Inicio',
    to: '/',
    icon: icons.appIcons.layoutDashboard,
    active: route.path === '/'
  },
  {
    label: 'Gastos',
    to: '/gastos',
    icon: icons.appIcons.receipt,
    active: route.path.startsWith('/gastos')
  },
  {
    label: 'Ingresos y Nómina',
    to: '/ingresos',
    icon: icons.appIcons.wallet,
    active: route.path.startsWith('/ingresos')
  },
  {
    label: 'Historial',
    to: '/historial',
    icon: icons.appIcons.history,
    active: route.path.startsWith('/historial')
  },
  {
    label: 'Reconciliación',
    to: '/reconciliacion',
    icon: icons.appIcons.scale,
    active: route.path.startsWith('/reconciliacion')
  },
  {
    label: 'Configuración',
    to: '/configuracion',
    icon: icons.appIcons.settings,
    active: route.path.startsWith('/configuracion')
  }
])

const { clear: clearSession } = useUserSession()

const handleLogout = async () => {
  try {
    await clearSession()
    await $fetch('/api/auth/logout', { method: 'POST' })
    toast.add({
      title: 'Sesión finalizada',
      description: 'Has cerrado sesión con éxito.',
      color: 'info',
      icon: icons.appIcons.logOut
    })
    await navigateTo('/login')
  } catch (err: unknown) {
    console.error('Error al cerrar sesión', err)
  }
}

const actionItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Nuevo Gasto',
      icon: icons.ui.icons.plus,
      onSelect: () => openNewExpenseModal()
    },
    {
      label: 'Registrar Nómina / Ingreso',
      icon: icons.appIcons.wallet,
      onSelect: () => openIncomeModal()
    }
  ],
  [
    {
      label: 'Cargar Datos Demo',
      icon: icons.appIcons.sparkles,
      onSelect: () => seedDemo()
    },
    {
      label: 'Limpiar Base de Datos',
      icon: icons.ui.icons.trash,
      color: 'error',
      onSelect: () => {
        confirmResetModalOpen.value = true
      }
    }
  ],
  [
    {
      label: 'Cerrar Sesión',
      icon: icons.appIcons.logOut,
      color: 'neutral',
      onSelect: () => handleLogout()
    }
  ]
])

// Atajo de teclado para nuevo gasto
defineShortcuts({
  n: () => openNewExpenseModal()
})

const seedDemo = async () => {
  seeding.value = true
  try {
    await $fetch('/api/seed-demo', { method: 'POST' })
    toast.add({
      title: 'Datos Demo Cargados',
      description: 'Se han generado gastos, nóminas y reconciliaciones de ejemplo.',
      color: 'success',
      icon: icons.appIcons.sparkles
    })
    triggerRefresh()
  } catch (err: unknown) {
    toast.add({
      title: 'Error',
      description: err instanceof Error ? err.message : 'No se pudieron cargar los datos de prueba.',
      color: 'error',
      icon: icons.ui.icons.error
    })
  } finally {
    seeding.value = false
  }
}

const resetData = async () => {
  resetting.value = true
  try {
    await $fetch('/api/reset-data', { method: 'POST' })
    toast.add({
      title: 'Datos Eliminados',
      description: 'La base de datos está limpia. Puedes empezar a registrar tus datos reales.',
      color: 'success',
      icon: icons.ui.icons.success
    })
    confirmResetModalOpen.value = false
    triggerRefresh()
  } catch (err: unknown) {
    toast.add({
      title: 'Error al limpiar datos',
      description: err instanceof Error ? err.message : 'Ocurrió un problema.',
      color: 'error',
      icon: icons.ui.icons.error
    })
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="sticky top-0 z-40 border-b border-default bg-default/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <NuxtLink
          to="/"
          class="flex min-w-0 items-center gap-2.5 font-semibold text-highlighted"
          aria-label="Control Tarjetas, inicio"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon
              :name="icons.appIcons.creditCard"
              class="size-5"
            />
          </span>
          <span class="truncate text-sm">Control Tarjetas</span>
        </NuxtLink>
        <UNavigationMenu
          :items="navItems"
          class="hidden min-w-0 xl:flex"
        />
        <div class="flex shrink-0 items-center gap-1.5">
          <UButton
            :icon="icons.ui.icons.plus"
            label="Nuevo gasto"
            size="sm"
            class="hidden sm:inline-flex"
            @click="openNewExpenseModal()"
          />
          <UDropdownMenu :items="actionItems">
            <UButton
              :icon="icons.ui.icons.ellipsis"
              color="neutral"
              variant="ghost"
              aria-label="Más acciones"
            />
          </UDropdownMenu>
          <UColorModeButton />
        </div>
      </div>
    </header>

    <main
      id="main-content"
      class="app-content mx-auto w-full min-w-0 max-w-7xl px-4 py-5 sm:px-6 sm:py-6"
    >
      <OfflineSyncBanner class="mb-4" />
      <slot />
    </main>

    <nav
      aria-label="Navegación móvil"
      class="mobile-dock fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 px-2 pt-2 backdrop-blur xl:hidden"
    >
      <div class="mx-auto grid max-w-lg grid-cols-5 items-center gap-1">
        <NuxtLink
          v-for="item in [navItems[0]!, navItems[1]!]"
          :key="item.to as string"
          :to="item.to"
          class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-xs"
          :class="item.active ? 'bg-primary/10 text-primary' : 'text-muted'"
          :aria-current="item.active ? 'page' : undefined"
        >
          <UIcon
            :name="item.icon!"
            class="size-5"
          />{{ item.label }}
        </NuxtLink>
        <UButton
          :icon="icons.ui.icons.plus"
          size="lg"
          aria-label="Nuevo gasto"
          class="mx-auto"
          @click="openNewExpenseModal()"
        />
        <NuxtLink
          to="/ingresos"
          class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-xs"
          :class="route.path === '/ingresos' ? 'bg-primary/10 text-primary' : 'text-muted'"
          :aria-current="route.path === '/ingresos' ? 'page' : undefined"
        >
          <UIcon
            :name="icons.appIcons.wallet"
            class="size-5"
          />Ingresos
        </NuxtLink>
        <button
          type="button"
          class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-xs"
          :class="mobileMenuOpen ? 'bg-primary/10 text-primary' : 'text-muted'"
          @click="mobileMenuOpen = true"
        >
          <UIcon
            :name="icons.ui.icons.menu"
            class="size-5"
          />Más
        </button>
      </div>
    </nav>

    <USlideover
      v-model:open="mobileMenuOpen"
      title="Control Tarjetas"
      description="Navegación y acciones"
    >
      <template #body>
        <UNavigationMenu
          :items="navItems"
          orientation="vertical"
          class="w-full"
        />
        <USeparator class="my-4" />
        <div class="space-y-2">
          <UButton
            :icon="icons.ui.icons.plus"
            label="Nuevo gasto"
            block
            @click="mobileMenuOpen = false; openNewExpenseModal()"
          />
          <UButton
            :icon="icons.appIcons.wallet"
            label="Registrar ingreso"
            color="neutral"
            variant="outline"
            block
            @click="mobileMenuOpen = false; openIncomeModal()"
          />
          <UButton
            :icon="icons.appIcons.sparkles"
            label="Cargar datos demo"
            color="neutral"
            variant="ghost"
            :loading="seeding"
            block
            @click="seedDemo()"
          />
          <UButton
            :icon="icons.ui.icons.trash"
            label="Limpiar datos"
            color="error"
            variant="ghost"
            block
            @click="confirmResetModalOpen = true"
          />
          <UButton
            :icon="icons.appIcons.logOut"
            label="Cerrar sesión"
            color="neutral"
            variant="ghost"
            block
            @click="handleLogout()"
          />
        </div>
      </template>
    </USlideover>

    <UModal
      v-model:open="confirmResetModalOpen"
      title="¿Borrar todos los movimientos?"
      description="La configuración y las tarjetas se conservarán."
    >
      <template #body>
        <p class="text-sm text-muted">
          Se eliminarán todos los gastos, ingresos y reconciliaciones. Esta acción no se puede deshacer.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Cancelar"
            @click="confirmResetModalOpen = false"
          />
          <UButton
            color="error"
            :icon="icons.ui.icons.trash"
            label="Sí, borrar todo"
            :loading="resetting"
            @click="resetData"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
