import React from 'react'
import {Switch, Route} from 'react-router-dom'
import Landing from '../components/Landing/Landing.jsx'
import Quill from '../components/Quill/Quill.jsx'


export default (
    <Switch>
        <Route component={Landing} path='/' exact />
        <Route component={Quill} path='/Quill' exact />


    </Switch>
)


