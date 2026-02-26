import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';

const Testing = () => {
  const navigate = useNavigate();
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableTests();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (testStarted && !testCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testStarted, testCompleted, timeRemaining]);

  const fetchAvailableTests = async () => {
    try {
      setLoading(true);
      // Mock data - In real app, fetch from backend
      const mockTests = [
        {
          id: 1,
          title: "ISO 17020 Certification Test",
          description: "Comprehensive assessment covering all ISO 17020 standards and practices",
          questions: 20,
          duration: 30, // minutes
          passingScore: 70,
          category: "Quality Standards",
          difficulty: "Intermediate"
        },
        {
          id: 2,
          title: "Safety Standards Assessment",
          description: "Test your knowledge on workplace safety standards and protocols",
          questions: 15,
          duration: 20,
          passingScore: 75,
          category: "Safety",
          difficulty: "Beginner"
        },
        {
          id: 3,
          title: "Quality Control Fundamentals",
          description: "Evaluate your understanding of quality control principles and methods",
          questions: 25,
          duration: 40,
          passingScore: 70,
          category: "Quality Assurance",
          difficulty: "Advanced"
        }
      ];
      setAvailableTests(mockTests);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tests:', error);
      setLoading(false);
    }
  };

  const fetchTestQuestions = async (testId) => {
    try {
      // Mock questions - In real app, fetch from backend based on testId
      const mockQuestions = [
        {
          id: 1,
          question: "What is the primary purpose of ISO 17020?",
          options: [
            "To certify products",
            "To provide criteria for bodies performing inspection",
            "To regulate manufacturing processes",
            "To standardize packaging methods"
          ],
          correctAnswer: 1,
          marks: 5
        },
        {
          id: 2,
          question: "Which of the following is a key requirement for inspection bodies under ISO 17020?",
          options: [
            "Having multiple locations",
            "Independence and impartiality",
            "Government ownership",
            "Annual revenue targets"
          ],
          correctAnswer: 1,
          marks: 5
        },
        {
          id: 3,
          question: "What does 'competence' mean in the context of ISO 17020?",
          options: [
            "Years of experience only",
            "Educational qualifications",
            "Ability to apply knowledge and skills to achieve intended results",
            "Salary grade"
          ],
          correctAnswer: 2,
          marks: 5
        },
        {
          id: 4,
          question: "How often should inspection equipment be calibrated?",
          options: [
            "Only when broken",
            "Once a year",
            "At intervals established by the inspection body",
            "Never, if new"
          ],
          correctAnswer: 2,
          marks: 5
        },
        {
          id: 5,
          question: "What is the role of a technical manager in an inspection body?",
          options: [
            "Financial planning only",
            "Ensuring technical operations are conducted properly",
            "Marketing services",
            "Hiring staff"
          ],
          correctAnswer: 1,
          marks: 5
        }
      ];
      setQuestions(mockQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const startTest = async (test) => {
    setSelectedTest(test);
    await fetchTestQuestions(test.id);
    setTestStarted(true);
    setTimeRemaining(test.duration * 60); // Convert minutes to seconds
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = () => {
    // Calculate score
    let correct = 0;
    let totalMarks = 0;
    
    questions.forEach(q => {
      totalMarks += q.marks;
      if (answers[q.id] === q.correctAnswer) {
        correct += q.marks;
      }
    });

    const percentage = (correct / totalMarks) * 100;
    setScore({
      correct,
      total: totalMarks,
      percentage: percentage.toFixed(2),
      passed: percentage >= selectedTest.passingScore
    });
    setTestCompleted(true);
  };

  const resetTest = () => {
    setSelectedTest(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTestStarted(false);
    setTestCompleted(false);
    setScore(null);
    setTimeRemaining(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty.toLowerCase()) {
      case 'beginner': return '#4caf50';
      case 'intermediate': return '#ff9800';
      case 'advanced': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <div className="lms-home" style={{ textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-block', 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #667eea', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading tests...</p>
      </div>
    );
  }

  // Test Results Screen
  if (testCompleted && score) {
    return (
      <div className="lms-home">
        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '5rem',
            marginBottom: '1.5rem'
          }}>
            {score.passed ? '🎉' : '📚'}
          </div>
          
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: score.passed ? '#4caf50' : '#f44336',
            marginBottom: '1rem'
          }}>
            {score.passed ? 'Congratulations!' : 'Keep Practicing!'}
          </h2>
          
          <p style={{ fontSize: '1.1rem', color: '#6c757d', marginBottom: '2rem' }}>
            {score.passed 
              ? 'You have successfully passed the test!' 
              : 'You need more practice. Try again!'}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>
                {score.percentage}%
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.5rem' }}>
                Score
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4caf50' }}>
                {score.correct}/{score.total}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.5rem' }}>
                Marks
              </div>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: score.passed ? '#4caf50' : '#f44336' }}>
                {score.passed ? '✓' : '✗'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.5rem' }}>
                Status
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={resetTest}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              Take Another Test
            </button>
            <button
              onClick={() => navigate('/user/my-certificates')}
              style={{
                padding: '12px 32px',
                background: '#fff',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              View Certificates
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test Taking Screen
  if (testStarted && !testCompleted && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="lms-home">
        {/* Test Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          marginBottom: '2rem',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {selectedTest.title}
            </h2>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                {formatTime(timeRemaining)}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Time Remaining
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          background: '#f0f0f0',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Question Card */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '2rem',
          boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
          minHeight: '400px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: '700'
            }}>
              {currentQuestionIndex + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#2c3e50',
                marginBottom: '0.25rem'
              }}>
                {currentQuestion.question}
              </h3>
              <span style={{
                fontSize: '0.85rem',
                color: '#95a5a6',
                fontWeight: '600'
              }}>
                {currentQuestion.marks} marks
              </span>
            </div>
          </div>

          {/* Options */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.25rem 1.5rem',
                  background: answers[currentQuestion.id] === index ? '#e8eaf6' : '#f8f9fa',
                  border: answers[currentQuestion.id] === index ? '2px solid #667eea' : '2px solid transparent',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => {
                  if (answers[currentQuestion.id] !== index) {
                    e.currentTarget.style.background = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  if (answers[currentQuestion.id] !== index) {
                    e.currentTarget.style.background = '#f8f9fa';
                  }
                }}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={index}
                  checked={answers[currentQuestion.id] === index}
                  onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                  style={{ marginRight: '1rem', width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ flex: 1 }}>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            style={{
              padding: '12px 24px',
              background: currentQuestionIndex === 0 ? '#e9ecef' : '#fff',
              color: currentQuestionIndex === 0 ? '#adb5bd' : '#667eea',
              border: '2px solid #667eea',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmitTest}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                Submit Test ✓
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Test Selection Screen
  return (
    <div className="lms-home">
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '2.5rem',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
        marginBottom: '2.5rem'
      }}>
        <p style={{
          opacity: 0.95,
          fontSize: '0.8rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          marginBottom: '0.75rem'
        }}>
          ✍️ Testing & Assessments
        </p>
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: '800',
          marginBottom: '0.75rem',
          textShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          Available Tests
        </h2>
        <p style={{
          fontSize: '1rem',
          opacity: 0.95,
          maxWidth: '600px'
        }}>
          Test your knowledge and earn certificates by completing these assessments
        </p>
      </header>

      {/* Tests Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '2rem'
      }}>
        {availableTests.map((test) => (
          <article
            key={test.id}
            style={{
              background: '#fff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.08)';
            }}
          >
            {/* Test Header */}
            <div style={{
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              padding: '2rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>📝</div>
              <span style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: getDifficultyColor(test.difficulty),
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {test.difficulty}
              </span>
            </div>

            {/* Test Body */}
            <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#95a5a6',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.75rem'
              }}>
                {test.category}
              </div>

              <h3 style={{
                fontSize: '1.35rem',
                fontWeight: '700',
                color: '#2c3e50',
                marginBottom: '1rem',
                lineHeight: '1.4'
              }}>
                {test.title}
              </h3>

              <p style={{
                fontSize: '0.95rem',
                color: '#6c757d',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                flex: 1
              }}>
                {test.description}
              </p>

              {/* Test Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '12px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea' }}>
                    {test.questions}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                    Questions
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea' }}>
                    {test.duration}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                    Minutes
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea' }}>
                    {test.passingScore}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                    Pass Score
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => startTest(test)}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
              >
                🚀 Start Test
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Testing;
