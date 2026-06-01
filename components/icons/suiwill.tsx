import * as React from "react";
import { SVGProps } from "react";
const SuiWillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth={1.667}
      d="M12.5 1.667H4.167v16.666h11.666V5.833L12.5 1.667Z"
    />
    <path
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth={1.667}
      d="M12.5 1.667v4.166h4.166"
    />
    <polyline
      points="4.5,12.5 6.5,12.5 7.5,9.5 9.5,15.5 11,11.5 12.5,12.5 15.5,12.5"
      stroke="#2196f3"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
export default SuiWillIcon;
