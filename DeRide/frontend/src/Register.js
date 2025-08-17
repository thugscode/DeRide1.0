import React from "react";
import swal from "sweetalert";
import { Button, TextField, Link } from "@material-ui/core";
import { withRouter } from "./utils";
const axios = require("axios");

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      confirm_password: ''
    };
  }

  onChange = (e) => this.setState({ [e.target.name]: e.target.value });

  register = () => {
    if (this.state.password !== this.state.confirm_password) {
      swal({
        text: "Passwords do not match",
        icon: "error",
        type: "error"
      });
      return;
    }

    axios.post('http://localhost:2000/register', {
      username: this.state.username,
      password: this.state.password,
    }).then((res) => {
      swal({
        text: res.data.title,
        icon: "success",
        type: "success"
      });
      this.props.navigate("/");
    }).catch((err) => {
      swal({
        text: err.response.data.errorMessage,
        icon: "error",
        type: "error"
      });
    });
  }

  render() {
    return (
      <div style={{ marginTop: '200px', display: 'flex', justifyContent: 'center', }}>
        <div style={{ border: '5px solid #4CAF50', padding: '20px', borderRadius: '10px', width: '300px' }}>
          <div>
            <h2>Register</h2>
          </div>

          <div>
            <TextField
              id="standard-basic"
              type="text"
              autoComplete="off"
              name="username"
              value={this.state.username}
              onChange={this.onChange}
              placeholder="User Name"
              required
            />
            <br /><br />
            <TextField
              id="standard-basic"
              type="password"
              autoComplete="off"
              name="password"
              value={this.state.password}
              onChange={this.onChange}
              placeholder="Password"
              required
            />
            <br /><br />
            <TextField
              id="standard-basic"
              type="password"
              autoComplete="off"
              name="confirm_password"
              value={this.state.confirm_password}
              onChange={this.onChange}
              placeholder="Confirm Password"
              required
            />
            <br /><br />
            <Button
              className="button_style"
              variant="contained"
              style={{ backgroundColor: '#4CAF50', color: 'white' }} // Custom color
              size="small"
              disabled={this.state.username === '' && this.state.password === ''}
              onClick={this.register}
            >
              Register
            </Button>
            <br /><br />
            <Link
              component="button"
              style={{ fontFamily: "inherit", fontSize: "inherit", color: '#4CAF50' }}
              onClick={() => {
                this.props.navigate("/");
              }}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(Register);
