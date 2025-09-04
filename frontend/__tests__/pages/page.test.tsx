import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock the next/link component
jest.mock('next/link', () => {
  return function MockedLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('Home Page', () => {
  it('renders the ValuerPro heading', () => {
    render(<Home />)
    
    const heading = screen.getByText('ValuerPro')
    expect(heading).toBeInTheDocument()
  })

  it('renders the main title with AI-Powered text', () => {
    render(<Home />)
    
    expect(screen.getByText('AI-Powered Property')).toBeInTheDocument()
    expect(screen.getByText('Valuation Reports')).toBeInTheDocument()
  })

  it('has login and register navigation links', () => {
    render(<Home />)
    
    const loginLinks = screen.getAllByText('Login')
    const registerLinks = screen.getAllByText(/Get Started|Start Free Trial/i)
    
    expect(loginLinks).toHaveLength(2) // Header and button
    expect(registerLinks.length).toBeGreaterThan(0)
  })

  it('displays the main features section', () => {
    render(<Home />)
    
    expect(screen.getByText('Streamline Your Valuation Workflow')).toBeInTheDocument()
    expect(screen.getByText('Automated OCR & Data Extraction')).toBeInTheDocument()
    expect(screen.getByText('Professional Report Generation')).toBeInTheDocument()
    expect(screen.getByText('Lightning Fast Processing')).toBeInTheDocument()
  })

  it('shows the how it works section', () => {
    render(<Home />)
    
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Upload Documents')).toBeInTheDocument()
    expect(screen.getByText('AI Processing')).toBeInTheDocument()
    expect(screen.getByText('Review & Edit')).toBeInTheDocument()
    expect(screen.getByText('Generate Report')).toBeInTheDocument()
  })

  it('has a footer with copyright information', () => {
    render(<Home />)
    
    expect(screen.getByText(/© 2024 ValuerPro/)).toBeInTheDocument()
  })
})