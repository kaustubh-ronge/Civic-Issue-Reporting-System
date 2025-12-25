import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import React from 'react'

const ClientLayout = ({children}) => {
  return (
     <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
    <main className='min-h-screen'>
      {children}
    </main>
    <Toaster position="top-center" richColors />
    </ThemeProvider>
  )
}

export default ClientLayout
