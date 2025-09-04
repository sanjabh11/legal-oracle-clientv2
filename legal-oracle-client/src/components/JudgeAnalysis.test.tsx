import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JudgeAnalysis } from './JudgeAnalysis'
import { LegalDatabaseService } from '../lib/supabase'

// Mock the supabase service
jest.mock('../lib/supabase', () => ({
  LegalDatabaseService: {
    getJudgePatterns: jest.fn(),
    getLegalCases: jest.fn(),
  },
}))

const mockGetJudgePatterns = LegalDatabaseService.getJudgePatterns as jest.MockedFunction<typeof LegalDatabaseService.getJudgePatterns>
const mockGetLegalCases = LegalDatabaseService.getLegalCases as jest.MockedFunction<typeof LegalDatabaseService.getLegalCases>

describe('JudgeAnalysis', () => {
  beforeEach(() => {
    mockGetJudgePatterns.mockResolvedValue([
      {
        id: 1,
        judge_name: 'Judge Smith',
        court: 'District Court',
        appointment_date: '2020-01-01',
        judicial_philosophy: 'Conservative',
        political_leanings: 'Conservative',
        cases_decided: 100,
        reversal_rate: 0.05,
        precedent_adherence_score: 0.9,
        case_types_handled: ['contract', 'tort'],
        average_sentence_length: '2 years',
      },
    ])
    mockGetLegalCases.mockResolvedValue([
      {
        id: 'case1',
        case_title: 'Test Case',
        case_summary: 'Test summary',
        court: 'District Court',
      },
    ])
  })

  test('renders judge list', async () => {
    render(<JudgeAnalysis />)

    await waitFor(() => {
      expect(screen.getByText('Judge Smith')).toBeInTheDocument()
    })
  })

  test('analyzes judge on click', async () => {
    const user = userEvent.setup()
    render(<JudgeAnalysis />)

    await waitFor(() => {
      expect(screen.getByText('Judge Smith')).toBeInTheDocument()
    })

    // Note: In a real test, you'd need to mock fetch for API calls
    // For now, this is a basic structure
  })

  test('displays judge statistics correctly', async () => {
    render(<JudgeAnalysis />)

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument() // cases decided
      expect(screen.getByText('5.0%')).toBeInTheDocument() // reversal rate
      expect(screen.getByText('90%')).toBeInTheDocument() // precedent adherence
    })
  })

  test('filters judges by court', async () => {
    const user = userEvent.setup()
    render(<JudgeAnalysis />)

    await waitFor(() => {
      expect(screen.getByText('Judge Smith')).toBeInTheDocument()
    })

    const filterSelect = screen.getByRole('combobox', { name: /filter by court/i })
    await user.selectOptions(filterSelect, 'district')

    // Judge should still be visible
    expect(screen.getByText('Judge Smith')).toBeInTheDocument()
  })
})
