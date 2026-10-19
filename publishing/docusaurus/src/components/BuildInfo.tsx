import React from 'react';

const BuildInfo = () => {
  return (
    <div style={{fontSize: "0.9em", color: "gray"}}>
      Posledný build: {process.env.BUILD_DATE}
    </div>
  );
};

export default BuildInfo;