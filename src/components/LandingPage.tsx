import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    header: {
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      borderBottom: '1px solid #e2e8f0'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    logoImage: {
      height: '42px',
      width: 'auto',
      objectFit: 'contain' as const
    },
    logoText: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#3b82f6',
    },
    nav: {
      display: 'flex',
      gap: '2rem',
      alignItems: 'center'
    },
    navButton: {
      color: '#64748b',
      textDecoration: 'none',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '0.95rem',
      transition: 'color 0.2s',
      padding: '0.5rem 0',
      background: 'none',
      border: 'none',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    loginButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.625rem 1.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    hero: {
      textAlign: 'center' as const,
      padding: '5rem 2rem',
      maxWidth: '800px',
      margin: '0 auto'
    },
    heroTitle: {
      fontSize: '3.5rem',
      fontWeight: '700',
      marginBottom: '1.5rem',
      color: '#1e293b',
      lineHeight: '1.2'
    },
    heroSubtitle: {
      fontSize: '1.25rem',
      marginBottom: '2.5rem',
      color: '#64748b',
      lineHeight: '1.6',
      maxWidth: '600px',
      margin: '0 auto'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      flexWrap: 'wrap' as const
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.875rem 2rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
    },
    secondaryButton: {
      backgroundColor: 'white',
      color: '#3b82f6',
      padding: '0.875rem 2rem',
      border: '2px solid #3b82f6',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    section: {
      padding: '5rem 2rem'
    },
    sectionTitle: {
      textAlign: 'center' as const,
      fontSize: '2.5rem',
      fontWeight: '700',
      marginBottom: '3rem',
      color: '#1e293b'
    },
    sectionSubtitle: {
      textAlign: 'center' as const,
      fontSize: '1.125rem',
      color: '#64748b',
      marginBottom: '3rem',
      maxWidth: '600px',
      margin: '0 auto',
      lineHeight: '1.6'
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    featureCard: {
      backgroundColor: 'white',
      padding: '2.5rem 2rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      transition: 'transform 0.2s, box-shadow 0.2s',
      textAlign: 'center' as const
    },
    featureIcon: {
      fontSize: '3rem',
      marginBottom: '1.5rem',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    featureTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      marginBottom: '1rem',
      color: '#1e293b'
    },
    featureDescription: {
      color: '#64748b',
      lineHeight: '1.6'
    },
    plansGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '2rem',
      maxWidth: '1000px',
      margin: '0 auto'
    },
    planCard: {
      backgroundColor: 'white',
      padding: '2.5rem 2rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '2px solid #e2e8f0',
      textAlign: 'center' as const,
      transition: 'all 0.3s ease',
      position: 'relative' as const
    },
    planCardFeatured: {
      borderColor: '#3b82f6',
      transform: 'translateY(-10px)',
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.1)'
    },
    planName: {
      fontSize: '1.5rem',
      fontWeight: '700',
      marginBottom: '1rem',
      color: '#1e293b'
    },
    planPrice: {
      fontSize: '3rem',
      fontWeight: '700',
      color: '#3b82f6',
      marginBottom: '0.5rem'
    },
    planPeriod: {
      color: '#64748b',
      fontSize: '1rem',
      marginBottom: '1.5rem'
    },
    planFeatures: {
      listStyle: 'none',
      padding: '0',
      margin: '2rem 0'
    },
    planFeature: {
      padding: '0.75rem 0',
      color: '#475569',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '0.95rem'
    },
    popularBadge: {
      position: 'absolute' as const,
      top: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.5rem 1.5rem',
      borderRadius: '2rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      letterSpacing: '0.5px'
    },
    ctaSection: {
      backgroundColor: '#1e293b',
      color: 'white',
      padding: '5rem 2rem',
      textAlign: 'center' as const,
      borderRadius: '1rem',
      margin: '5rem auto',
      maxWidth: '800px'
    },
    ctaTitle: {
      fontSize: '2.5rem',
      fontWeight: '700',
      marginBottom: '1.5rem'
    },
    ctaSubtitle: {
      fontSize: '1.125rem',
      opacity: 0.9,
      marginBottom: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      lineHeight: '1.6'
    },
    emailInput: {
      padding: '0.875rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      marginRight: '1rem',
      minWidth: '300px',
      backgroundColor: 'white',
      color: '#1e293b'
    },
    footer: {
      backgroundColor: '#f1f5f9',
      color: '#475569',
      padding: '3rem 2rem',
      textAlign: 'center' as const,
      borderTop: '1px solid #e2e8f0'
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '2rem',
      maxWidth: '800px',
      margin: '3rem auto',
      textAlign: 'center' as const
    },
    statNumber: {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: '#3b82f6',
      marginBottom: '0.5rem'
    },
    statLabel: {
      color: '#64748b',
      fontSize: '0.95rem',
      fontWeight: '500'
    }
  };

  const features = [
    {
      icon: '🏥',
      title: 'Gestión de Clínicas',
      description: 'Administra múltiples clínicas dentales desde un solo panel centralizado.'
    },
    {
      icon: '📋',
      title: 'Control de Trabajos',
      description: 'Seguimiento en tiempo real de todos los trabajos dentales en producción.'
    },
    {
      icon: '💰',
      title: 'Gestión de Precios',
      description: 'Configura listas de precios personalizadas por servicio y cliente.'
    },
    {
      icon: '📊',
      title: 'Reportes Detallados',
      description: 'Métricas completas de productividad, ingresos y rentabilidad.'
    },
    {
      icon: '👨‍🔧',
      title: 'Equipo Técnico',
      description: 'Organiza y supervisa a tu equipo de laboratoristas eficientemente.'
    },
    {
      icon: '🔒',
      title: 'Seguridad Total',
      description: 'Tus datos protegidos con encriptación de grado empresarial.'
    }
  ];

  const plans = [
    {
      id: 'gratuita',
      name: 'Prueba Gratuita',
      price: 0,
      period: '30 días',
      features: [
        'Hasta 3 clínicas',
        'Hasta 10 trabajos/mes',
        'Soporte por email',
        'Reportes básicos',
        'App web completa'
      ],
      popular: false,
      buttonText: 'Comenzar Gratis',
      buttonColor: '#10b981'
    },
    {
      id: 'profesional',
      name: 'Plan Profesional',
      price: 49,
      period: 'por mes',
      features: [
        'Clínicas ilimitadas',
        'Trabajos ilimitados',
        'Soporte prioritario',
        'Reportes avanzados',
        'App web premium',
        'Backup automático',
        'API de integración'
      ],
      popular: true,
      buttonText: 'Elegir Profesional',
      buttonColor: '#3b82f6'
    },
    {
      id: 'empresarial',
      name: 'Plan Empresarial',
      price: 99,
      period: 'por mes',
      features: [
        'Todo del plan Profesional',
        'Soporte 24/7 dedicado',
        'Reportes personalizados',
        'White-label disponible',
        'Onboarding personalizado',
        'Capacitación incluida',
        'Facturación automática'
      ],
      popular: false,
      buttonText: 'Contactar Ventas',
      buttonColor: '#8b5cf6'
    }
  ];

  const stats = [
    { number: '100+', label: 'Laboratorios' },
    { number: '5,000+', label: 'Trabajos Mensuales' },
    { number: '98%', label: 'Satisfacción' },
    { number: '24/7', label: 'Soporte Activo' }
  ];

  const handleDemoRequest = () => {
    if (email) {
      alert(`¡Gracias! Te contactaremos pronto al email: ${email} para coordinar tu demo.`);
      setEmail('');
    } else {
      alert('Por favor ingresa tu email para solicitar el demo.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <img 
            src="/Dentalflow-Manager.png" 
            alt="DentalFlow Logo" 
            style={styles.logoImage}
          />
        </div>
        <nav style={styles.nav}>
          <button 
            style={styles.navButton}
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Características
          </button>
          <button 
            style={styles.navButton}
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Planes
          </button>
          <button 
            style={styles.navButton}
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Contacto
          </button>
          <button 
            style={styles.loginButton}
            onClick={() => navigate('/login')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Iniciar Sesión
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          La Plataforma Todo-en-Uno para<br />
          <span style={{ color: '#3b82f6' }}>Laboratorios Dentales</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Optimiza tu workflow, aumenta tu productividad y haz crecer tu laboratorio 
          con la solución más completa del mercado.
        </p>
        <div style={styles.buttonGroup}>
          <button 
            style={styles.primaryButton}
            onClick={() => navigate('/registro')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Comenzar Prueba Gratis
          </button>
          <button 
            style={styles.secondaryButton}
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#3b82f6';
            }}
          >
            Ver Planes
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '3rem 2rem', backgroundColor: 'white' }}>
        <div style={styles.stats}>
          {stats.map((stat, index) => (
            <div key={index}>
              <div style={styles.statNumber}>{stat.number}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ ...styles.section, backgroundColor: 'white' }} id="features">
        <h2 style={styles.sectionTitle}>Todo lo que Necesitas en un Solo Lugar</h2>
        <p style={styles.sectionSubtitle}>
          Una plataforma completa diseñada específicamente para las necesidades 
          únicas de los laboratorios dentales modernos.
        </p>
        <div style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div 
              key={index}
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
              }}
            >
              <div style={styles.featureIcon}>{feature.icon}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ ...styles.section, backgroundColor: '#f8fafc' }} id="pricing">
        <h2 style={styles.sectionTitle}>Planes que Crecen Contigo</h2>
        <p style={styles.sectionSubtitle}>
          Elige el plan perfecto para tu laboratorio. Sin contratos largos, cancela cuando quieras.
        </p>
        <div style={styles.plansGrid}>
          {plans.map((plan) => (
            <div 
              key={plan.id}
              style={{
                ...styles.planCard,
                ...(plan.popular ? styles.planCardFeatured : {})
              }}
              onMouseEnter={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                }
              }}
            >
              {plan.popular && <div style={styles.popularBadge}>MÁS POPULAR</div>}
              
              <h3 style={styles.planName}>{plan.name}</h3>
              <div style={styles.planPrice}>
                {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
              </div>
              <div style={styles.planPeriod}>{plan.period}</div>
              
              <ul style={styles.planFeatures}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={styles.planFeature}>✓ {feature}</li>
                ))}
              </ul>
              
              <button 
                style={{
                  backgroundColor: plan.buttonColor,
                  color: 'white',
                  padding: '0.875rem 2rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.2s',
                  marginTop: '1rem'
                }}
                onClick={() => plan.price === 0 ? navigate('/registro') : navigate('/registro', { state: { plan: plan.id } })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 
                    plan.buttonColor === '#3b82f6' ? '#2563eb' :
                    plan.buttonColor === '#10b981' ? '#059669' :
                    plan.buttonColor === '#8b5cf6' ? '#7c3aed' : plan.buttonColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = plan.buttonColor;
                }}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '3rem', color: '#64748b' }}>
          <p>✅ 14 días de garantía de devolución | ✅ Soporte 24/7 | ✅ Actualizaciones gratuitas</p>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection} id="contact">
        <h2 style={styles.ctaTitle}>¿Listo para Transformar tu Laboratorio?</h2>
        <p style={styles.ctaSubtitle}>
          Agenda una demo personalizada y descubre cómo DentalFlow puede aumentar 
          tu productividad en un 40% desde el primer mes.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="tu@email.com"
            style={styles.emailInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button 
            style={{
              ...styles.primaryButton,
              backgroundColor: '#10b981'
            }}
            onClick={handleDemoRequest}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            Solicitar Demo
          </button>
        </div>
        
        <p style={{ marginTop: '2rem', opacity: 0.8, fontSize: '0.95rem' }}>
          O contáctanos directamente: <strong>contacto@dentalflow.com</strong>
        </p>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ ...styles.logoContainer, justifyContent: 'center', marginBottom: '1rem' }}>
            <img 
              src="/Dentalflow-Manager.png" 
              alt="DentalFlow Logo" 
              style={{ ...styles.logoImage, height: '36px' }}
            />
          </div>
          <p style={{ marginBottom: '2rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
            La plataforma líder en gestión para laboratorios dentales en Latinoamérica
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button 
              style={{ ...styles.navButton, color: '#475569' }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Características
            </button>
            <button 
              style={{ ...styles.navButton, color: '#475569' }}
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Planes
            </button>
            <button 
              style={{ ...styles.navButton, color: '#475569' }}
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Contacto
            </button>
            <button 
              style={{ ...styles.navButton, color: '#475569' }}
              onClick={() => navigate('/login')}
            >
              Iniciar Sesión
            </button>
            <button 
              style={{ ...styles.navButton, color: '#475569' }}
              onClick={() => navigate('/registro')}
            >
              Registrarse
            </button>
          </div>
          
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            © {new Date().getFullYear()} DentalFlow. Todos los derechos reservados.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            contact@dentalflow.com | Soporte: +56 9 84201 462
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;