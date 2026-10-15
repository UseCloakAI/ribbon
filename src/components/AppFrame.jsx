import { motion } from 'motion/react'

export default function AppFrame({ title, children, wide }) {
  return (
    <motion.section
      className={`app ${wide ? 'is-wide' : ''}`}
      initial={{ opacity: 0, x: 56, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 36, scale: 0.99, transition: { duration: 0.22, ease: [0.3, 0, 1, 1] } }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
    >
      <header className="app-head">
        <h2 className="app-title">{title}</h2>
      </header>
      <motion.div
        className="app-body"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
      >
        {children}
      </motion.div>
    </motion.section>
  )
}
