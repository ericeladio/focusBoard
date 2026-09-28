import GoalActions from './GoalActions.jsx'
import GoalStatus from './GoalStatus.jsx'
import GoalTrack from './GoalTrack.jsx'

function GoalControls({ goal, variant = 'wall' }) {
  return (
    <>
      {goal.seguimiento === 'compuesta' ? (
        <GoalStatus goal={goal} />
      ) : (
        <GoalTrack goal={goal} />
      )}
      <GoalActions goal={goal} variant={variant} />
    </>
  )
}

export default GoalControls
